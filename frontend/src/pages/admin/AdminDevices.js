import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminDevices({ token }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const headers = { Authorization: 'Bearer ' + token };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    axios.get('/api/admin/devices', { headers }).then(r => setDevices(r.data)).finally(() => setLoading(false));
  }, []);

  const deleteDevice = async (id) => {
    if (!window.confirm('Delete this device?')) return;
    await axios.delete('/api/admin/devices/' + id, { headers });
    setDevices(prev => prev.filter(d => d._id !== id));
    showToast('Device deleted');
  };

  const statusColor = { available: 'bg-green-50 text-green-700', rented: 'bg-yellow-50 text-yellow-700', offline: 'bg-gray-50 text-gray-600' };

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div>
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg">{toast}</div>}
      <h3 className="font-semibold text-gray-900 mb-4">All Devices ({devices.length})</h3>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Device','Location','Owner','Size','Price/hr','Status','Action'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {devices.map(d => (
              <tr key={d._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{d.deviceName}</td>
                <td className="px-4 py-3 text-gray-500">{d.location}</td>
                <td className="px-4 py-3 text-gray-500">{d.owner?.name}</td>
                <td className="px-4 py-3 text-gray-500">{d.screenSize}</td>
                <td className="px-4 py-3 font-medium">${d.pricePerHour}/hr</td>
                <td className="px-4 py-3">
                  <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + (statusColor[d.status] || 'bg-gray-50 text-gray-600')}>{d.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteDevice(d._id)}
                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 transition-colors">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!devices.length && <div className="py-12 text-center text-sm text-gray-400">No devices found</div>}
      </div>
    </div>
  );
}
