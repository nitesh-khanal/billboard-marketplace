import React, { useState } from 'react';
import axios from 'axios';

export default function ListDevice({ onSuccess }) {
  const [form, setForm] = useState({ deviceName: '', location: '', screenSize: '', resolution: '', pricePerHour: '', deviceId: '', availabilitySchedule: '24/7' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await axios.post('/api/devices', { ...form, pricePerHour: parseFloat(form.pricePerHour) });
      onSuccess();
    } catch (err) { setError(err.response?.data?.msg || 'Failed to list device'); }
    finally { setLoading(false); }
  };

  const fields = [
    { name: 'deviceName', label: 'Device Name', placeholder: 'Times Square Billboard #1', type: 'text' },
    { name: 'location', label: 'Location', placeholder: 'New York, NY', type: 'text' },
    { name: 'screenSize', label: 'Screen Size', placeholder: '72 inches', type: 'text' },
    { name: 'resolution', label: 'Resolution', placeholder: '1920x1080', type: 'text' },
    { name: 'pricePerHour', label: 'Price Per Hour ($)', placeholder: '25.00', type: 'number' },
    { name: 'deviceId', label: 'Device ID', placeholder: 'DEVICE-001', type: 'text' },
    { name: 'availabilitySchedule', label: 'Availability Schedule', placeholder: '24/7', type: 'text' },
  ];

  return (
    <div className="max-w-xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">List a New Device</h3>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          {fields.map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input name={f.name} type={f.type} value={form[f.name]} onChange={handle} required placeholder={f.placeholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {loading ? 'Listing...' : 'List Device'}
          </button>
        </form>
      </div>
    </div>
  );
}
