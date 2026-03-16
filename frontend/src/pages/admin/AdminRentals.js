import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

export default function AdminRentals({ token }) {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    axios.get(API + '/api/admin/rentals', { headers })
      .then(r => setRentals(r.data))
      .catch(err => setError(err.response?.data?.msg || 'Failed to load rentals: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? rentals : rentals.filter(r => r.status === filter);
  const totalRevenue = rentals.reduce((s, r) => s + r.totalCost, 0);
  const totalCommission = rentals.reduce((s, r) => s + (r.commission || 0), 0);
  const statusColor = { active: 'bg-green-50 text-green-700', completed: 'bg-blue-50 text-blue-700', cancelled: 'bg-red-50 text-red-600' };

  if (loading) return <div className="text-sm text-gray-400">Loading rentals...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-3">
          <div className="bg-green-50 rounded-xl px-4 py-2">
            <p className="text-xs text-green-600">Total Revenue</p>
            <p className="font-bold text-green-700">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl px-4 py-2">
            <p className="text-xs text-blue-600">Commission (5%)</p>
            <p className="font-bold text-blue-700">${totalCommission.toFixed(2)}</p>
          </div>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Device','Buyer','Seller','Start','End','Amount','Commission','Status'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(r => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.device?.deviceName}</td>
                <td className="px-4 py-3 text-gray-500">{r.buyer?.name}</td>
                <td className="px-4 py-3 text-gray-500">{r.seller?.name}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.startDate).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.endDate).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium text-gray-900">${r.totalCost.toFixed(2)}</td>
                <td className="px-4 py-3 text-green-600">${(r.commission || 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + (statusColor[r.status] || '')}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="py-12 text-center text-sm text-gray-400">No rentals found</div>}
      </div>
    </div>
  );
}