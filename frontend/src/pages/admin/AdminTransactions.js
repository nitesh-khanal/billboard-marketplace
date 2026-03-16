import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

export default function AdminTransactions({ token }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    axios.get(API + '/api/admin/transactions', { headers })
      .then(r => setTransactions(r.data))
      .catch(err => setError(err.response?.data?.msg || 'Failed to load transactions: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter(t =>
    (t.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-sm text-gray-400">Loading transactions...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">All Transactions ({transactions.length})</h3>
        <input placeholder="Search user or description..." value={search} onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black w-72" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['User','Description','Type','Amount','Balance After','Date'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(t => (
              <tr key={t._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.user?.name}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{t.description}</td>
                <td className="px-4 py-3">
                  <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + (t.type === 'credit' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>{t.type}</span>
                </td>
                <td className={"px-4 py-3 font-medium " + (t.type === 'credit' ? 'text-green-600' : 'text-red-500')}>
                  {t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-500">${t.balanceAfter.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="py-12 text-center text-sm text-gray-400">No transactions found</div>}
      </div>
    </div>
  );
}