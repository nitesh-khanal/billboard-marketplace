import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const statusColor = { available: 'bg-green-50 text-green-700', rented: 'bg-yellow-50 text-yellow-700', offline: 'bg-gray-50 text-gray-600' };

export default function MyDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/devices/mine').then(r => setDevices(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400">Loading devices...</div>;
  if (!devices.length) return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-lg">No devices listed yet</p>
      <p className="text-sm mt-1">Click "List New Device" to get started</p>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {devices.map(d => (
        <div key={d._id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900">{d.deviceName}</h4>
              <p className="text-sm text-gray-500">{d.location}</p>
            </div>
            <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + statusColor[d.status]}>{d.status}</span>
          </div>
          <div className="space-y-1 text-sm text-gray-600 mb-4">
            <p>Size: {d.screenSize} · {d.resolution}</p>
            <p className="font-medium text-gray-900">${d.pricePerHour}/hr</p>
            <p className="text-xs text-gray-400">ID: {d.deviceId}</p>
            <p className="text-xs text-gray-400">{d.availabilitySchedule}</p>
          </div>
          <button onClick={() => navigate('/playback/' + d._id)}
            className="w-full text-xs text-center py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
            View Playback
          </button>
        </div>
      ))}
    </div>
  );
}
