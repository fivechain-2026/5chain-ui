import { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [checking, setChecking] = useState(true);

  // On mount, verify the session cookie is still valid
  useEffect(() => {
    api.get('/auth/me')
      .then(r => setUser(r?.data?.user ?? r?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    setUser(null);
  }

  // Show nothing while verifying session — avoids flash of login page
  if (checking) return null;

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
