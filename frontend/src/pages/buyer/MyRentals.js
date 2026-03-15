import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function MyRentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/rentals/buyer').then(r => setRentals(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;
  if (!rentals.length) return <div className="text-center py-16 text-gray-400">No rentals yet. Browse devices to get started.</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rentals.map(r => (
        <div key={r._id} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900">{r.device?.deviceName}</h4>
              <p className="text-sm text-gray-500">{r.device?.location}</p>
            </div>
            <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + (r.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600')}>{r.status}</span>
          </div>
          <div className="space-y-1 text-sm text-gray-600 mb-4">
            <p>{r.device?.screenSize}</p>
            <p className="text-xs text-gray-400">{new Date(r.startDate).toLocaleString()} → {new Date(r.endDate).toLocaleString()}</p>
            <p className="font-medium text-gray-900">Paid: ${r.totalCost.toFixed(2)}</p>
          </div>
          <button onClick={() => navigate('/playback/' + r.device?._id)}
            className="w-full text-xs text-center py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
            View Playback
          </button>
        </div>
      ))}
    </div>
  );
}
