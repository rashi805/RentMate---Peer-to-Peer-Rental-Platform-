import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('rentmate-token')));
  useEffect(() => {
    const token = localStorage.getItem('rentmate-token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(() => localStorage.removeItem('rentmate-token')).finally(() => setLoading(false));
    const logout = () => { setUser(null); setLoading(false); };
    window.addEventListener('rentmate:logout', logout);
    return () => window.removeEventListener('rentmate:logout', logout);
  }, []);
  const value = useMemo(() => ({
    user, loading,
    async login(credentials) { const { data } = await api.post('/auth/login', credentials); localStorage.setItem('rentmate-token', data.token); setUser(data.user); return data.user; },
    async register(values) { const { data } = await api.post('/auth/register', values); localStorage.setItem('rentmate-token', data.token); setUser(data.user); return data.user; },
    async updateProfile(values) { const { data } = await api.put('/users/profile', values); setUser(data.user); return data.user; },
    logout() { localStorage.removeItem('rentmate-token'); setUser(null); }
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
