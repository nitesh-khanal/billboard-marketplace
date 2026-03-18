import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DeviceScriptModal from '../../components/DeviceScriptModal';

const statusColor = {
  available: 'bg-green-50 text-green-700',
  rented:    'bg-yellow-50 text-yellow-700',
  offline:   'bg-gray-50 text-gray-600',
};

export default function MyDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [toast, setToast] = useState('');
  const [scriptDevice, setScriptDevice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/devices/mine').then(r => setDevices(r.data)).finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await axios.delete('/api/devices/' + confirmId);
      setDevices(prev => prev.filter(d => d._id !== confirmId));
      if (res.data.activeRentals > 0) {
        showToast('Device removed. ' + res.data.activeRentals + ' rental(s) refunded. You were charged $' + res.data.totalPenalty + ' penalty.');
      } else {
        showToast('Device removed successfully.');
      }
    } catch (err) {
      showToast(err.response?.data?.msg || 'Failed to remove device');
    } finally {
      setRemoving(false);
      setConfirmId(null);
    }
  };

  const confirmingDevice = devices.find(d => d._id === confirmId);

  if (loading) return <div className="text-sm text-gray-400">Loading devices...</div>;
  if (!devices.length) return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-lg">No devices listed yet</p>
      <p className="text-sm mt-1">Click "List New Device" to get started</p>
    </div>
  );

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg max-w-sm">
          {toast}
        </div>
      )}

      {scriptDevice && <DeviceScriptModal device={scriptDevice} onClose={() => setScriptDevice(null)} />}

      {confirmId && confirmingDevice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Remove this device?</h3>
            <p className="text-sm font-medium text-gray-700 mb-3">"{confirmingDevice.deviceName}"</p>
            {confirmingDevice.status === 'rented' ? (
              <div className="bg-red-50 rounded-xl p-4 mb-5 text-sm space-y-1">
                <p className="font-medium text-red-700">This device has an active rental!</p>
                <p className="text-red-600">The buyer will receive a full refund of remaining time.</p>
                <p className="text-red-600">You will be charged the refund + 10% penalty.</p>
                <p className="text-red-600">You keep payment for time already used.</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm text-gray-600">
                No active rentals. Removed with no penalty.
              </div>
            )}
            <div className="flex space-x-3">
              <button onClick={() => setConfirmId(null)} disabled={removing}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Keep Device
              </button>
              <button onClick={handleRemove} disabled={removing}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
                {removing ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map(d => (
          <div key={d._id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{d.deviceName}</h4>
                <p className="text-sm text-gray-500">{d.location}</p>
              </div>
              <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + statusColor[d.status]}>
                {d.status}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>Size: {d.screenSize} · {d.resolution}</p>
              <p className="font-medium text-gray-900">${d.pricePerHour}/hr</p>
              <p className="text-xs text-gray-400">ID: {d.deviceId}</p>
              <p className="text-xs text-gray-400">{d.availabilitySchedule}</p>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => navigate('/playback/' + d._id)}
                className="text-xs text-center py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                Playback
              </button>
              <button onClick={() => setConfirmId(d._id)}
                className="text-xs text-center py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}