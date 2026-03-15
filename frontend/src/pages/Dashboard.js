import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import SellerDashboard from './seller/SellerDashboard';
import BuyerDashboard from './buyer/BuyerDashboard';
import Wallet from './shared/Wallet';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    if (activeTab === 'wallet') return <Wallet />;
    if (user?.currentRole === 'seller') return <SellerDashboard />;
    return <BuyerDashboard />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
}
