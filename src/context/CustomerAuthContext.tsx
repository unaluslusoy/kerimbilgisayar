import React, { createContext, useContext, useState, useEffect } from 'react';

interface CustomerUser {
  userId: number;
  email: string;
  name: string;
  role: string;
}

interface CustomerAuthContextType {
  user: CustomerUser | null;
  token: string | null;
  login: (token: string, user: CustomerUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('customer_token');
    const storedUser = localStorage.getItem('customer_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Invalid customer user JSON');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: CustomerUser) => {
    localStorage.setItem('customer_token', newToken);
    localStorage.setItem('customer_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/customer/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (e) { console.error(e); }
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    setToken(null);
    setUser(null);
    window.location.href = '/musteri/giris';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div></div>;

  return (
    <CustomerAuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => useContext(CustomerAuthContext);
