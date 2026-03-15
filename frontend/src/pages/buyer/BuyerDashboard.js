import React, { useState } from 'react';
import BrowseDevices from './BrowseDevices';
import MyRentals from './MyRentals';
import UploadAd from './UploadAd';
import AdSchedule from './AdSchedule';

const tabs = [
  { id: 'browse', label: 'Browse Devices' },
  { id: 'rentals', label: 'My Rentals' },
  { id: 'upload', label: 'Upload Ad' },
  { id: 'schedule', label: 'Ad Schedule' },
];

export default function BuyerDashboard() {
  const [tab, setTab] = useState('browse');
  const [refresh, setRefresh] = useState(0);
  const doRefresh = () => setRefresh(r => r + 1);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Buyer Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Browse screens, rent devices, and run your ads</p>
      </div>
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"px-4 py-2 rounded-lg text-sm font-medium transition-colors " + (tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'browse' && <BrowseDevices onRented={() => { doRefresh(); setTab('rentals'); }} />}
      {tab === 'rentals' && <MyRentals key={refresh} />}
      {tab === 'upload' && <UploadAd onUploaded={() => { doRefresh(); setTab('schedule'); }} />}
      {tab === 'schedule' && <AdSchedule key={refresh} />}
    </div>
  );
}
