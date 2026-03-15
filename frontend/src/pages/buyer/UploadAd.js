import React, { useEffect, useState } from 'react';
import axios from 'axios';



export default function UploadAd({ onUploaded }) {
  const [rentals, setRentals] = useState([]);
  const [form, setForm] = useState({ adName: '', rentalId: '', startTime: '', endTime: '' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const toLocalInput = (utcDate) => {
    const d = new Date(utcDate);
    const offsetMs = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offsetMs);
    return local.toISOString().slice(0, 16);
  };

  useEffect(() => {
    axios.get('/api/rentals/buyer').then(r => setRentals(r.data.filter(r => r.status === 'active')));
  }, []);

  const selectedRental = rentals.find(r => r._id === form.rentalId);
  const rentalMin = selectedRental ? toLocalInput(selectedRental.startDate) : '';
  const rentalMax = selectedRental ? toLocalInput(selectedRental.endDate)   : '';

  // When rental changes, reset times and clamp to rental window
  const handleRentalChange = (e) => {
    const rental = rentals.find(r => r._id === e.target.value);
    setForm(f => ({
      ...f,
      rentalId: e.target.value,
      startTime: rental ? toLocalInput(rental.startDate) : '',
      endTime:   rental ? toLocalInput(rental.endDate)   : '',
    }));
  };

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (!file) throw new Error('Please select a file');

      // Client-side guard
      if (selectedRental) {
        const adStart = new Date(form.startTime);
        const adEnd   = new Date(form.endTime);
        const rStart  = new Date(selectedRental.startDate);
        const rEnd    = new Date(selectedRental.endDate);
        if (adStart < rStart) throw new Error('Ad start cannot be before rental start: ' + rStart.toLocaleString());
        if (adEnd   > rEnd)   throw new Error('Ad end cannot be after rental end: ' + rEnd.toLocaleString());
        if (adEnd   <= adStart) throw new Error('Ad end time must be after start time');
      }

      const data = new FormData();
      data.append('file', file);
      data.append('adName', form.adName);
      data.append('deviceId', selectedRental?.device?._id || '');
      data.append('rentalId', form.rentalId);
      data.append('startTime', form.startTime);
      data.append('endTime', form.endTime);
      await axios.post('/api/ads/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Ad uploaded and scheduled!');
      setTimeout(() => { onUploaded(); }, 1200);
    } catch (err) { setError(err.response?.data?.msg || err.message || 'Upload failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Upload & Schedule Ad</h3>
        {error   && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm">{success}</div>}
        <form onSubmit={submit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Name</label>
            <input type="text" value={form.adName} onChange={e => setForm({...form, adName: e.target.value})} required
              placeholder="Summer Campaign 2024"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad File (Image or Video)</label>
            <input type="file" accept="image/*,video/*" onChange={e => setFile(e.target.files[0])} required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Rental (Active)</label>
            <select value={form.rentalId} onChange={handleRentalChange} required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
              <option value="">Choose a rented device...</option>
              {rentals.map(r => (
                <option key={r._id} value={r._id}>{r.device?.deviceName} — {r.device?.location}</option>
              ))}
            </select>
          </div>

          {/* Rental window hint */}
          {selectedRental && (
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <span className="font-medium">Rental window:</span>{' '}
              {new Date(selectedRental.startDate).toLocaleString()} → {new Date(selectedRental.endDate).toLocaleString()}
              <br/>
              <span className="text-blue-500">Your ad schedule must stay within this range.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Start Time</label>
              <input
                type="datetime-local"
                value={form.startTime}
                min={rentalMin}
                max={rentalMax}
                onChange={e => setForm({...form, startTime: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad End Time</label>
              <input
                type="datetime-local"
                value={form.endTime}
                min={form.startTime || rentalMin}
                max={rentalMax}
                onChange={e => setForm({...form, endTime: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Duration summary */}
          {form.startTime && form.endTime && new Date(form.endTime) > new Date(form.startTime) && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-600">
                Ad duration:{' '}
                <span className="font-medium text-gray-900">
                  {((new Date(form.endTime) - new Date(form.startTime)) / 3600000).toFixed(2)} hours
                </span>
              </p>
              {selectedRental && (
                <p className="text-gray-500 text-xs mt-0.5">
                  Rental window:{' '}
                  {((new Date(selectedRental.endDate) - new Date(selectedRental.startDate)) / 3600000).toFixed(2)} hours total
                </p>
              )}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {loading ? 'Uploading...' : 'Upload & Schedule Ad'}
          </button>
        </form>
      </div>
    </div>
  );
}
