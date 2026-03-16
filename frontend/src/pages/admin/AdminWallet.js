import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

export default function AdminWallet({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    axios.get(API + '/api/admin/wallet', { headers })
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.msg || 'Failed to load wallet: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400">Loading wallet...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="bg-black text-white rounded-2xl p-6">
          <p className="text-sm text-gray-400">Total Earnings</p>
          <p className="text-4xl font-bold mt-1">${data.totalEarnings.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-2">Commission + Penalties</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <p className="text-sm text-gray-500">Commission Collected</p>
          <p className="text-3xl font-bold text-green-600 mt-1">${data.totalCommission.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-2">{(data.commissionRate * 100).toFixed(0)}% on every rental</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <p className="text-sm text-gray-500">Penalties Collected</p>
          <p className="text-3xl font-bold text-red-500 mt-1">${data.totalPenalties.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-2">10% cancellation fees</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-medium text-gray-900">Recent Commission Earnings</h3>
        </div>
        {!data.recentCommissions.length
          ? <div className="py-12 text-center text-sm text-gray-400">No commissions yet</div>
          : <div className="divide-y divide-gray-50">
              {data.recentCommissions.map(r => (
                <div key={r._id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-800">{r.device?.deviceName} — rented by {r.buyer?.name}</p>
                    <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">+${r.commission.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">of ${r.totalCost.toFixed(2)} rental</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}