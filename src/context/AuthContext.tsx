import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  login: (email: string, password: string, remember?: boolean, turnstileToken?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    const storedUser = localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }
  }, []);

  const login = async (email: string, password: string, remember = true, turnstileToken = '') => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, turnstileToken }),
    });
    
    let data;
    try {
      const text = await res.text();
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Sunucu ile iletişim kurulamadı. Lütfen daha sonra tekrar deneyin.');
    }
    
    if (!res.ok) {
      throw new Error(data.error || 'Giriş başarısız, lütfen bilgilerinizi kontrol edin.');
    }
    
    setToken(data.token);
    setUser(data.user);
    const persistentStorage = remember ? localStorage : sessionStorage;
    const temporaryStorage = remember ? sessionStorage : localStorage;
    temporaryStorage.removeItem('admin_token');
    temporaryStorage.removeItem('admin_user');
    persistentStorage.setItem('admin_token', data.token);
    persistentStorage.setItem('admin_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
