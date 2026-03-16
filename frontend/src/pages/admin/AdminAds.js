import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

export default function AdminAds({ token }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const headers = { Authorization: 'Bearer ' + token };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    axios.get(API + '/api/admin/ads', { headers })
      .then(r => setAds(r.data))
      .catch(err => setError(err.response?.data?.msg || 'Failed to load ads: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const deleteAd = async (id) => {
    if (!window.confirm('Delete this ad permanently?')) return;
    try {
      await axios.delete(API + '/api/admin/ads/' + id, { headers });
      setAds(prev => prev.filter(a => a._id !== id));
      showToast('Ad deleted');
    } catch (err) { showToast('Failed: ' + (err.response?.data?.msg || err.message)); }
  };

  const now = new Date();
  const getStatus = (ad) => {
    const s = new Date(ad.startTime); const e = new Date(ad.endTime);
    if (now >= s && now <= e) return { label: 'Playing', cls: 'bg-green-50 text-green-700' };
    if (now < s) return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700' };
    return { label: 'Ended', cls: 'bg-gray-50 text-gray-500' };
  };

  const filtered = ads.filter(a =>
    (a.adName || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.uploadedBy?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.device?.deviceName || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-sm text-gray-400">Loading ads...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>;

  return (
    <div>
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg">{toast}</div>}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">All Ads ({ads.length})</h3>
        <input placeholder="Search ad, device, or advertiser..." value={search} onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black w-72" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Ad Name','Device','Advertiser','Type','Start','End','Status','Action'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(a => {
              const st = getStatus(a);
              return (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.adName}</td>
                  <td className="px-4 py-3 text-gray-500">{a.device?.deviceName}</td>
                  <td className="px-4 py-3 text-gray-500">{a.uploadedBy?.name}</td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + (a.fileType === 'video' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700')}>{a.fileType}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(a.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(a.endTime).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + st.cls}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteAd(a._id)}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 transition-colors">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && <div className="py-12 text-center text-sm text-gray-400">No ads found</div>}
      </div>
    </div>
  );
}