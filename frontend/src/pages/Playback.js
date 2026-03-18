import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

export default function Playback() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAd, setCurrentAd] = useState(null);
  const [nextAd, setNextAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  const isKiosk = new URLSearchParams(window.location.search).get('kiosk') === 'true';
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!isKiosk) return;
    const requestFS = () => {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    };
    // Try immediately and also on first click anywhere
    const timer = setTimeout(requestFS, 500);
    document.addEventListener('click', requestFS, { once: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', requestFS);
    };
  }, [isKiosk]);

  const fetchAds = async () => {
    const res = await axios.get('/api/ads/device/' + deviceId);
    setAds(res.data);
    return res.data;
  };

  const getCurrentAndNext = (adList, idx) => {
    const now = new Date();
    const active = adList.filter(a => new Date(a.startTime) <= now && new Date(a.endTime) >= now);
    const upcoming = adList.filter(a => new Date(a.startTime) > now).sort((a,b) => new Date(a.startTime)-new Date(b.startTime));
    if (active.length > 0) {
      const cur = active[idx % active.length];
      const nxt = active.length > 1 ? active[(idx + 1) % active.length] : (upcoming[0] || null);
      return { cur, nxt };
    }
    if (upcoming.length > 0) return { cur: null, nxt: upcoming[0] };
    return { cur: null, nxt: null };
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [devRes, adList] = await Promise.all([
          axios.get('/api/devices/' + deviceId),
          fetchAds()
        ]);
        setDevice(devRes.data);
        const { cur, nxt } = getCurrentAndNext(adList, 0);
        setCurrentAd(cur); setNextAd(nxt);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    init();

    socketRef.current = io(API_URL);
    socketRef.current.emit('join-device', deviceId);
    socketRef.current.on('ad-deleted', () => {
      fetchAds().then(adList => {
        const { cur, nxt } = getCurrentAndNext(adList, 0);
        setCurrentAd(cur); setNextAd(nxt);
      });
    });
    socketRef.current.on('ad-scheduled', () => {
      fetchAds().then(adList => {
        const { cur, nxt } = getCurrentAndNext(adList, 0);
        setCurrentAd(cur); setNextAd(nxt);
      });
    });

    return () => {
      socketRef.current?.emit('leave-device', deviceId);
      socketRef.current?.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deviceId]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex(i => {
        const next = i + 1;
        const { cur, nxt } = getCurrentAndNext(ads, next);
        setCurrentAd(cur); setNextAd(nxt);
        return next;
      });
    }, 10000);
    return () => clearInterval(timerRef.current);
  }, [ads]);

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading playback...</div>;

  // ── Kiosk mode: full screen ad only ──
  if (isKiosk) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center relative overflow-hidden cursor-pointer" onClick={() => {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      }}>
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400">LIVE</span>
        </div>
        {currentAd ? (
          currentAd.fileType === 'video'
            ? <video key={currentAd._id} src={API_URL + currentAd.fileUrl}
                autoPlay loop muted className="w-full h-full object-cover" />
            : <img key={currentAd._id} src={API_URL + currentAd.fileUrl}
                alt={currentAd.adName} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-gray-600">
            <div className="w-16 h-16 border-2 border-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">{device?.deviceName}</p>
            <p className="text-xs text-gray-600 mt-1">Waiting for ads...</p>
          </div>
        )}
        {currentAd && (
          <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1.5 rounded-lg">
            <p className="text-xs text-white">{currentAd.adName}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Normal playback page ──
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">{device?.deviceName}</h1>
            <p className="text-gray-400 text-sm">{device?.location} · {device?.screenSize} · {device?.resolution}</p>
          </div>
          <button onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
            ← Dashboard
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 aspect-video flex items-center justify-center overflow-hidden mb-6 relative">
          {currentAd ? (
            currentAd.fileType === 'video'
              ? <video key={currentAd._id} src={API_URL + currentAd.fileUrl} autoPlay loop muted className="w-full h-full object-cover" />
              : <img key={currentAd._id} src={API_URL + currentAd.fileUrl} alt={currentAd.adName} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-gray-600">
              <div className="w-16 h-16 border-2 border-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm">No ad currently playing</p>
            </div>
          )}
          {currentAd && (
            <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1.5 rounded-lg">
              <p className="text-xs text-white font-medium">{currentAd.adName}</p>
            </div>
          )}
          <div className="absolute top-3 right-3 flex items-center space-x-1.5">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">LIVE</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Now Playing</p>
            {currentAd
              ? <div>
                  <p className="font-medium">{currentAd.adName}</p>
                  <p className="text-sm text-gray-400">{currentAd.fileType} · by {currentAd.uploadedBy?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Until: {new Date(currentAd.endTime).toLocaleString()}</p>
                </div>
              : <p className="text-gray-500 text-sm">Idle — no active ad</p>
            }
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Up Next</p>
            {nextAd
              ? <div>
                  <p className="font-medium">{nextAd.adName}</p>
                  <p className="text-sm text-gray-400">{nextAd.fileType} · by {nextAd.uploadedBy?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Starts: {new Date(nextAd.startTime).toLocaleString()}</p>
                </div>
              : <p className="text-gray-500 text-sm">No upcoming ads scheduled</p>
            }
          </div>
        </div>

        {ads.length > 0 && (
          <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Full Schedule ({ads.length} ads)</p>
            <div className="space-y-2">
              {ads.map(a => (
                <div key={a._id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{a.adName}</span>
                  <span className="text-gray-500 text-xs">{new Date(a.startTime).toLocaleString()} → {new Date(a.endTime).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}