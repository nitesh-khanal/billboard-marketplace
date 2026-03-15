import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
      axios.get('/api/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('token'); delete axios.defaults.headers.common['Authorization']; })
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.token;
    setUser(res.data.user);
    return res.data.user;
  };

  const signup = async (name, email, password) => {
    const res = await axios.post('/api/auth/signup', { name, email, password });
    localStorage.setItem('token', res.data.token);
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.token;
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const switchRole = async (role) => {
    const res = await axios.put('/api/auth/switch-role', { role });
    setUser(res.data.user);
    return res.data.user;
  };

  const updateBalance = (newBalance) => setUser(prev => ({ ...prev, walletBalance: newBalance }));

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, switchRole, updateBalance }}>
      {children}
    </AuthContext.Provider>
  );
}
