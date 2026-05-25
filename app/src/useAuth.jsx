import { createContext, useContext, useState } from 'react';

// DEV BYPASS — set to null to require real login
const DEV_USER = {
  id: 'dev-user-id',
  organization_id: 'dev-org-id',
  email: 'dev@5chain.local',
  role: 'admin',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEV_USER);

  function logout() {
    setUser(null);
    // TODO: call POST /auth/logout when real auth is wired
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
