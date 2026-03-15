import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdSchedule() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  const fetchAds = () => {
    setLoading(true);
    axios.get('/api/ads/buyer').then(r => setAds(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAds(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete('/api/ads/' + confirmId);
      setAds(prev => prev.filter(a => a._id !== confirmId));
      showToast('Ad deleted successfully');
    } catch (err) {
      showToast(err.response?.data?.msg || 'Delete failed');
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;
  if (!ads.length) return <div className="text-center py-16 text-gray-400">No ads uploaded yet</div>;

  const now = new Date();
  const getStatus = (ad) => {
    const s = new Date(ad.startTime); const e = new Date(ad.endTime);
    if (now >= s && now <= e) return { label: 'Playing', cls: 'bg-green-50 text-green-700' };
    if (now < s) return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700' };
    return { label: 'Ended', cls: 'bg-gray-50 text-gray-500' };
  };

  const confirmingAd = ads.find(a => a._id === confirmId);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmId && confirmingAd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Delete this ad?</h3>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-medium text-gray-700">"{confirmingAd.adName}"</span>
            </p>
            <p className="text-sm text-gray-500 mb-5">
              {getStatus(confirmingAd).label === 'Playing'
                ? 'This ad is currently playing. It will be removed from the screen immediately.'
                : 'This ad will be permanently deleted and cannot be recovered.'}
            </p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmId(null)} disabled={deleting}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Ad Name','Device','Type','Start','End','Status','Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ads.map(a => {
              const st = getStatus(a);
              const isPlaying = st.label === 'Playing';
              return (
                <tr key={a._id} className={"hover:bg-gray-50 " + (isPlaying ? 'bg-green-50/30' : '')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {isPlaying && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>}
                      <span className="font-medium text-gray-900">{a.adName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.device?.deviceName}</td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + (a.fileType === 'video' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700')}>{a.fileType}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.endTime).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + st.cls}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setConfirmId(a._id)}
                      className={"text-xs px-3 py-1.5 rounded-lg border transition-colors " + (isPlaying
                        ? 'border-red-200 text-red-500 hover:bg-red-50'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                      {isPlaying ? 'Stop & Delete' : 'Delete'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
