import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function MyRentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState('');
  const navigate = useNavigate();
  const { updateBalance } = useAuth();

  useEffect(() => {
    axios.get('/api/rentals/buyer').then(r => setRentals(r.data)).finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  // Calculate refund preview
  const calcRefund = (rental) => {
    const now   = new Date();
    const start = new Date(rental.startDate);
    const end   = new Date(rental.endDate);
    const totalHours     = (end - start) / 3600000;
    const usedHours      = Math.max(0, Math.min((now - start) / 3600000, totalHours));
    const remainingHours = Math.max(0, totalHours - usedHours);
    const pricePerHour   = rental.totalCost / totalHours;
    const usedCost       = parseFloat((usedHours * pricePerHour).toFixed(2));
    const remainingCost  = parseFloat((remainingHours * pricePerHour).toFixed(2));
    const refund         = parseFloat((remainingCost * 0.75).toFixed(2));
    return { usedCost, remainingCost, refund, remainingHours: remainingHours.toFixed(1) };
  };

  const openCancel = (rental) => {
    setConfirmId(rental._id);
    setPreview(calcRefund(rental));
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await axios.post('/api/rentals/' + confirmId + '/cancel');
      updateBalance(res.data.newBalance);
      setRentals(prev => prev.map(r => r._id === confirmId ? { ...r, status: 'cancelled' } : r));
      showToast('Rental cancelled. $' + res.data.refundAmount.toFixed(2) + ' refunded to your wallet.');
    } catch (err) {
      showToast(err.response?.data?.msg || 'Cancellation failed');
    } finally {
      setCancelling(false);
      setConfirmId(null);
      setPreview(null);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;
  if (!rentals.length) return <div className="text-center py-16 text-gray-400">No rentals yet. Browse devices to get started.</div>;

  const confirmingRental = rentals.find(r => r._id === confirmId);

  const statusColor = {
    active:    'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-600',
    completed: 'bg-gray-50 text-gray-500',
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Cancel confirm modal */}
      {confirmId && confirmingRental && preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Cancel this rental?</h3>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">{confirmingRental.device?.deviceName}</span>
            </p>

            {/* Refund breakdown */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <p className="font-medium text-gray-700 mb-2">Refund breakdown</p>
              <div className="flex justify-between text-gray-500">
                <span>Total paid</span>
                <span>${confirmingRental.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Used time cost</span>
                <span>- ${preview.usedCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Remaining ({preview.remainingHours}h × 75%)</span>
                <span>${preview.refund.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Cancellation fee (25%)</span>
                <span>- ${(preview.remainingCost - preview.refund).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-gray-900">
                <span>You get back</span>
                <span className="text-green-600">${preview.refund.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button onClick={() => { setConfirmId(null); setPreview(null); }} disabled={cancelling}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Keep Rental
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rentals.map(r => (
          <div key={r._id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{r.device?.deviceName}</h4>
                <p className="text-sm text-gray-500">{r.device?.location}</p>
              </div>
              <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + (statusColor[r.status] || 'bg-gray-50 text-gray-500')}>
                {r.status}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>{r.device?.screenSize}</p>
              <p className="text-xs text-gray-400">
                {new Date(r.startDate).toLocaleString()} →<br/>{new Date(r.endDate).toLocaleString()}
              </p>
              <p className="font-medium text-gray-900">Paid: ${r.totalCost.toFixed(2)}</p>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => navigate('/playback/' + r.device?._id)}
                className="flex-1 text-xs text-center py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                View Playback
              </button>
              {r.status === 'active' && (
                <button onClick={() => openCancel(r)}
                  className="flex-1 text-xs text-center py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
