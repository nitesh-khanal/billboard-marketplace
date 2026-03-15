import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function RentedDevices() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/rentals/seller').then(r => setRentals(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;
  if (!rentals.length) return <div className="text-center py-16 text-gray-400">No rentals yet</div>;

  const totalRevenue = rentals.reduce((s, r) => s + r.totalCost, 0);

  return (
    <div>
      <div className="mb-4 p-4 bg-green-50 rounded-xl inline-block">
        <p className="text-sm text-green-600">Total Revenue</p>
        <p className="text-2xl font-bold text-green-700">${totalRevenue.toFixed(2)}</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Device','Buyer','Start','End','Revenue','Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rentals.map(r => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.device?.deviceName}</td>
                <td className="px-4 py-3 text-gray-600">{r.buyer?.name}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.startDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.endDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium text-green-600">${r.totalCost.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " + (r.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600')}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
