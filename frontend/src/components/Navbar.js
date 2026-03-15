import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSwitch = async () => {
    const newRole = user.currentRole === 'seller' ? 'buyer' : 'seller';
    await switchRole(newRole);
    setActiveTab('dashboard');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'wallet', label: 'Wallet' },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900 text-sm">BillboardMkt</span>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={"px-3 py-1.5 rounded-lg text-sm transition-colors " + (activeTab === item.id ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50")}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-400 hidden sm:block">${(user?.walletBalance || 0).toFixed(2)}</span>
            <span className={"inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium " + (user?.currentRole === 'seller' ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700")}>
              {user?.currentRole === 'seller' ? 'Seller' : 'Buyer'}
            </span>
            <button onClick={handleSwitch}
              className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded-lg hover:border-gray-300 transition-colors">
              Switch to {user?.currentRole === 'seller' ? 'Buyer' : 'Seller'}
            </button>
            <span className="text-sm text-gray-700 hidden sm:block">{user?.name}</span>
            <button onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors">Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
}
