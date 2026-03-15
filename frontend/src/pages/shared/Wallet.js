import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function Wallet() {
  const { user, updateBalance } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    axios.get('/api/wallet/transactions').then(r => setTransactions(r.data));
  }, []);

  const addFunds = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await axios.post('/api/wallet/add', { amount: parseFloat(amount) });
      updateBalance(res.data.balance);
      setSuccess('$' + parseFloat(amount).toFixed(2) + ' added to wallet!');
      setAmount('');
      const txRes = await axios.get('/api/wallet/transactions');
      setTransactions(txRes.data);
    } catch (err) { setError(err.response?.data?.msg || 'Failed to add funds'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Wallet</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your balance and view transactions</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="bg-black text-white rounded-2xl p-6">
          <p className="text-sm text-gray-400">Current Balance</p>
          <p className="text-4xl font-bold mt-1">${(user?.walletBalance || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-2">{user?.name}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Add Funds</p>
          {error && <div className="mb-2 p-2 bg-red-50 text-red-600 rounded text-xs">{error}</div>}
          {success && <div className="mb-2 p-2 bg-green-50 text-green-600 rounded text-xs">{success}</div>}
          <div className="flex space-x-2">
            <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Amount ($)" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            <button onClick={addFunds} disabled={!amount || loading}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {loading ? '...' : 'Add'}
            </button>
          </div>
          <div className="flex space-x-2 mt-2">
            {[10, 50, 100, 500].map(v => (
              <button key={v} onClick={() => setAmount(v.toString())}
                className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                +${v}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-medium text-gray-900">Transaction History</h3>
        </div>
        {!transactions.length
          ? <div className="py-12 text-center text-sm text-gray-400">No transactions yet</div>
          : <div className="divide-y divide-gray-50">
              {transactions.map(t => (
                <div key={t._id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-800">{t.description}</p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={"font-medium text-sm " + (t.type === 'credit' ? 'text-green-600' : 'text-red-500')}>
                      {t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">Bal: ${t.balanceAfter.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}
