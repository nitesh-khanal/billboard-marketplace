import React, { useState } from 'react';
import ListDevice from './ListDevice';
import MyDevices from './MyDevices';
import RentedDevices from './RentedDevices';
import SellerAds from './SellerAds';

const tabs = [
  { id: 'devices', label: 'My Devices' },
  { id: 'list', label: 'List New Device' },
  { id: 'rented', label: 'Rented Out' },
  { id: 'ads', label: 'Ads on My Screens' },
];

export default function SellerDashboard() {
  const [tab, setTab] = useState('devices');
  const [refresh, setRefresh] = useState(0);
  const doRefresh = () => setRefresh(r => r + 1);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Seller Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your display devices and track revenue</p>
      </div>
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"px-4 py-2 rounded-lg text-sm font-medium transition-colors " + (tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'devices' && <MyDevices key={refresh} />}
      {tab === 'list' && <ListDevice onSuccess={() => { doRefresh(); setTab('devices'); }} />}
      {tab === 'rented' && <RentedDevices />}
      {tab === 'ads' && <SellerAds />}
    </div>
  );
}
