import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('adminToken');
    return stored ? { token: stored } : null;
  });

  const login = async (email, password) => {
    const res = await axios.post('/api/admin/login', { email, password });
    localStorage.setItem('adminToken', res.data.token);
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.token;
    setAdmin(res.data.admin);
    return res.data.admin;
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdmin(null);
  };

  return (
    <AdminContext.Provider value={{ admin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}
