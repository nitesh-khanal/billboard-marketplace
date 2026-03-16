import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

export default function AdminUsers({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');

  const headers = { Authorization: 'Bearer ' + token };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    axios.get(API + '/api/admin/users', { headers })
      .then(r => setUsers(r.data))
      .catch(err => setError(err.response?.data?.msg || 'Failed to load users: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleBan = async (id) => {
    try {
      const res = await axios.put(API + '/api/admin/users/' + id + '/ban', {}, { headers });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBanned: res.data.isBanned } : u));
      showToast(res.data.msg);
    } catch (err) { showToast('Failed: ' + (err.response?.data?.msg || err.message)); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await axios.delete(API + '/api/admin/users/' + id, { headers });
      setUsers(prev => prev.filter(u => u._id !== id));
      showToast('User deleted');
    } catch (err) { showToast('Failed: ' + (err.response?.data?.msg || err.message)); }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-sm text-gray-400">Loading users...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>;

  return (
    <div>
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg">{toast}</div>}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">All Users ({users.length})</h3>
        <input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black w-64" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Name','Email','Role','Balance','Joined','Status','Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(u => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + (u.currentRole === 'seller' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700')}>{u.currentRole}</span>
                </td>
                <td className="px-4 py-3 text-gray-700">${(u.walletBalance || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + (u.isBanned ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700')}>{u.isBanned ? 'Banned' : 'Active'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    <button onClick={() => toggleBan(u._id)}
                      className={"text-xs px-2 py-1 rounded border transition-colors " + (u.isBanned ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-yellow-200 text-yellow-600 hover:bg-yellow-50')}>
                      {u.isBanned ? 'Unban' : 'Ban'}
                    </button>
                    <button onClick={() => deleteUser(u._id)}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 transition-colors">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="py-12 text-center text-sm text-gray-400">No users found</div>}
      </div>
    </div>
  );
}