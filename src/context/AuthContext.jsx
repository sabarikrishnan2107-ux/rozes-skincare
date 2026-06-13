import { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const login = async (email, password) => {
    const res = await base44.auth.login(email, password);
    if (res.ok) setUser(res.user);
    return res;
  };

  const logout = async () => {
    await base44.auth.logout();
    setUser(null);
  };

  const updateProfile = async (patch) => {
    const next = await base44.auth.update(patch);
    setUser(u => u ? { ...u, ...patch } : u);
    return next;
  };

  const demoCreds = { email: 'admin@rozeskin.com', password: 'rozes123' };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, updateProfile, demoCreds }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
