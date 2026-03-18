import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ListDevice from './ListDevice';
import MyDevices from './MyDevices';
import RentedDevices from './RentedDevices';
import SellerAds from './SellerAds';

const tabs = [
  { id: 'devices', label: 'My Devices' },
  { id: 'list', label: 'List New Device' },
  { id: 'rented', label: 'Rented Out' },
  { id: 'ads', label: 'Ads on My Screens' },
];

export default function SellerDashboard() {
  const [tab, setTab] = useState('devices');
  const [refresh, setRefresh] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const doRefresh = () => setRefresh(r => r + 1);

  useEffect(() => {
    let interval;

    const checkRentals = async () => {
      try {
        const res = await axios.get('/api/rentals/seller');
        const now = new Date();
        const upcoming = res.data.filter(r => {
          if (r.status !== 'active') return false;
          const start = new Date(r.startDate);
          const diff = (start - now) / 1000;
          const end = new Date(r.endDate);
return (diff <= 120 && diff > -3600) && end > now;
        });

        if (upcoming.length > 0) {
          const rental = upcoming[0];
          const start = new Date(rental.startDate);
          const secondsLeft = Math.max(0, Math.round((start - now) / 1000));
          const deviceId = rental.device?._id || rental.device;
          const deviceName = rental.device?.deviceName || 'Device';

          if (secondsLeft <= 0) {
            openFullscreen(deviceId, deviceName);
          } else {
            setCountdown({ deviceId, deviceName, secondsLeft });
          }
        } else {
          setCountdown(null);
        }
      } catch (err) {
        console.error('Rental check failed:', err);
      }
    };

    checkRentals();
    interval = setInterval(checkRentals, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!countdown || countdown.secondsLeft <= 0) return;
    const timer = setTimeout(() => {
      const newSeconds = countdown.secondsLeft - 1;
      if (newSeconds <= 0) {
        openFullscreen(countdown.deviceId, countdown.deviceName);
        setCountdown(null);
      } else {
        setCountdown(prev => ({ ...prev, secondsLeft: newSeconds }));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const openFullscreen = (deviceId, deviceName) => {
    const url = window.location.origin + '/playback/' + deviceId;
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
      win.addEventListener('load', () => {
        try {
          if (win.document.documentElement.requestFullscreen) {
            win.document.documentElement.requestFullscreen();
          }
        } catch (e) {}
      });
    }
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? m + 'm ' + sec + 's' : sec + 's';
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Seller Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your display devices and track revenue</p>
      </div>

      {countdown && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
          <div>
            <p className="font-medium text-amber-800">Rental starting soon — {countdown.deviceName}</p>
            <p className="text-sm text-amber-600 mt-0.5">
  {countdown.secondsLeft <= 0 ? 'Rental is live now! Display should be open.' : 'Display will open automatically in ' + fmt(countdown.secondsLeft)}
</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-2xl font-bold text-amber-700 font-mono">{fmt(countdown.secondsLeft)}</div>
            <button onClick={() => openFullscreen(countdown.deviceId, countdown.deviceName)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors">
              Open Now
            </button>
          </div>
        </div>
      )}

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"px-4 py-2 rounded-lg text-sm font-medium transition-colors " + (tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'devices' && <MyDevices key={refresh} />}
      {tab === 'list' && <ListDevice onSuccess={() => { doRefresh(); setTab('devices'); }} />}
      {tab === 'rented' && <RentedDevices />}
      {tab === 'ads' && <SellerAds />}
    </div>
  );
}