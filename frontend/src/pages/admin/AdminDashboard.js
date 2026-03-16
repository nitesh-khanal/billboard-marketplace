import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAdmin } from '../../context/AdminContext';
import AdminUsers from './AdminUsers';
import AdminDevices from './AdminDevices';
import AdminRentals from './AdminRentals';
import AdminTransactions from './AdminTransactions';
import AdminAds from './AdminAds';

const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'devices', label: 'Devices' },
    { id: 'rentals', label: 'Rentals' },
    { id: 'ads', label: 'Ads' },
    { id: 'transactions', label: 'Transactions' },
  ];

const API = process.env.REACT_APP_API_URL || '';

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [commission, setCommission] = useState('');
  const [commMsg, setCommMsg] = useState('');
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();

  const token = localStorage.getItem('adminToken');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    axios.get(API + '/api/admin/stats', { headers })
      .then(r => { setStats(r.data); setCommission((r.data.commissionRate * 100).toFixed(0)); })
      .catch(err => setError(err.response?.data?.msg || 'Failed to load stats: ' + err.message));
  }, []);

  const updateCommission = async () => {
    try {
      await axios.put(API + '/api/admin/commission', { rate: parseFloat(commission) / 100 }, { headers });
      setCommMsg('Commission updated!');
      setTimeout(() => setCommMsg(''), 3000);
    } catch (err) { setCommMsg('Failed to update'); }
  };

  const handleLogout = () => { logout(); navigate('/admin'); };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, color: 'text-blue-700' },
    { label: 'Total Devices', value: stats.totalDevices, color: 'text-purple-700' },
    { label: 'Total Rentals', value: stats.totalRentals, color: 'text-amber-700' },
    { label: 'Active Rentals', value: stats.activeRentals, color: 'text-green-700' },
    { label: 'Total Ads', value: stats.totalAds, color: 'text-pink-700' },
    { label: 'Platform Revenue', value: '$' + (stats.totalRevenue || 0).toFixed(2), color: 'text-gray-700' },
    { label: 'Commission Earned', value: '$' + (stats.totalCommission || 0).toFixed(2), color: 'text-green-700' },
    { label: 'Penalties Collected', value: '$' + (stats.totalPenalties || 0).toFixed(2), color: 'text-red-700' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-950 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-semibold">Admin Panel</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-400 text-sm">{admin?.name || admin?.email}</span>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white transition-colors">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex space-x-1 bg-white border border-gray-100 p-1 rounded-xl mb-6 w-fit shadow-sm">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={"px-4 py-2 rounded-lg text-sm font-medium transition-colors " + (tab === t.id ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700")}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div>
            {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
            {!stats && !error && <div className="text-sm text-gray-400">Loading stats...</div>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              {statCards.map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={"text-2xl font-bold mt-1 " + s.color}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md">
              <h3 className="font-semibold text-gray-900 mb-1">Commission Rate</h3>
              <p className="text-sm text-gray-500 mb-4">Applied to every rental. Currently <strong>{stats ? stats.commissionRate * 100 : 5}%</strong></p>
              {commMsg && <div className="mb-3 p-2 bg-green-50 text-green-600 rounded-lg text-sm">{commMsg}</div>}
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <input type="number" min="0" max="100" value={commission}
                    onChange={e => setCommission(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black pr-8" />
                  <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
                </div>
                <button onClick={updateCommission}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">
                  Update
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'users'        && <AdminUsers token={token} />}
        {tab === 'devices'      && <AdminDevices token={token} />}
        {tab === 'rentals'      && <AdminRentals token={token} />}
        {tab === 'transactions' && <AdminTransactions token={token} />}
        {tab === 'ads' && <AdminAds token={token} />}
      </div>
    </div>
  );
}