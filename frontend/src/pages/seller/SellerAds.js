import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function SellerAds() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/ads/seller').then(r => setAds(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;
  if (!ads.length) return <div className="text-center py-16 text-gray-400">No ads scheduled on your devices yet</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {['Ad Name','Device','Advertiser','Type','Start','End'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {ads.map(a => (
            <tr key={a._id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{a.adName}</td>
              <td className="px-4 py-3 text-gray-600">{a.device?.deviceName}</td>
              <td className="px-4 py-3 text-gray-500">{a.uploadedBy?.name}</td>
              <td className="px-4 py-3">
                <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " + (a.fileType === 'video' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700')}>{a.fileType}</span>
              </td>
              <td className="px-4 py-3 text-gray-500">{new Date(a.startTime).toLocaleString()}</td>
              <td className="px-4 py-3 text-gray-500">{new Date(a.endTime).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
