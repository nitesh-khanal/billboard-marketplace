import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function BrowseDevices({ onRented }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renting, setRenting] = useState(null);
  const [form, setForm] = useState({ startDate: '', endDate: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { updateBalance } = useAuth();

  useEffect(() => {
    axios.get('/api/devices/available').then(r => setDevices(r.data)).finally(() => setLoading(false));
  }, []);

  const openRent = (device) => { setRenting(device); setError(''); setSuccess(''); setForm({ startDate: '', endDate: '' }); };

  const submitRent = async () => {
    setError('');
    try {
      const res = await axios.post('/api/rentals', { deviceId: renting._id, startDate: form.startDate, endDate: form.endDate });
      updateBalance(res.data.newBalance);
      setSuccess('Device rented successfully!');
      setDevices(prev => prev.filter(d => d._id !== renting._id));
      setTimeout(() => { setRenting(null); onRented(); }, 1200);
    } catch (err) { setError(err.response?.data?.msg || 'Rental failed'); }
  };

  if (loading) return <div className="text-sm text-gray-400">Loading devices...</div>;

  return (
    <div>
      {!devices.length && <div className="text-center py-16 text-gray-400">No available devices right now</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map(d => (
          <div key={d._id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="mb-3">
              <h4 className="font-medium text-gray-900">{d.deviceName}</h4>
              <p className="text-sm text-gray-500">{d.location}</p>
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>{d.screenSize} · {d.resolution}</p>
              <p className="font-semibold text-gray-900">${d.pricePerHour}/hr</p>
              <p className="text-xs text-gray-400">Owner: {d.owner?.name}</p>
              <p className="text-xs text-gray-400">{d.availabilitySchedule}</p>
            </div>
            <button onClick={() => openRent(d)}
              className="w-full bg-black text-white py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors">
              Rent This Screen
            </button>
          </div>
        ))}
      </div>

      {renting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">Rent: {renting.deviceName}</h3>
            <p className="text-sm text-gray-500 mb-4">${renting.pricePerHour}/hr</p>
            {error && <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            {success && <div className="mb-3 p-3 bg-green-50 text-green-600 rounded-lg text-sm">{success}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                <input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                <input type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              {form.startDate && form.endDate && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="text-gray-600">Duration: {((new Date(form.endDate)-new Date(form.startDate))/3600000).toFixed(1)} hours</p>
                  <p className="font-semibold text-gray-900">Total: ${(((new Date(form.endDate)-new Date(form.startDate))/3600000)*renting.pricePerHour).toFixed(2)}</p>
                </div>
              )}
              <div className="flex space-x-3 mt-2">
                <button onClick={() => setRenting(null)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={submitRent}
                  className="flex-1 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">Confirm Rental</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
