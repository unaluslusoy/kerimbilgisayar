import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { AlertCircle, LogIn, UserPlus, Loader2 } from 'lucide-react';

export default function CustomerAuth() {
  const { isAuthenticated, login } = useCustomerAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/musteri/panel';
    return <Navigate to={from} replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        // Mock forgot password API request
        await new Promise(r => setTimeout(r, 1000));
        setError('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        setTimeout(() => setIsForgotPassword(false), 3000);
      } else if (isLogin) {
        const res = await fetch('/api/customer/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Giriş yapılamadı');
        login(data.token, data.user);
        navigate('/musteri/panel');
      } else {
        const res = await fetch('/api/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Kayıt olunamadı');
        
        setIsLogin(true);
        setError('Kayıt başarılı! Lütfen giriş yapın.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="text-center block text-3xl font-extrabold text-green-600 mb-2">
          Kerim Bilgisayar
        </Link>
        <h2 className="text-center text-2xl font-bold text-gray-900">
          {isForgotPassword ? 'Şifremi Unuttum' : isLogin ? 'Müşteri Girişi' : 'Hesap Oluştur'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-theme sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className={`p-4 rounded-md flex items-center gap-2 ${error.includes('gönderildi') || error.includes('başarılı') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {error.includes('gönderildi') || error.includes('başarılı') ? null : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <fieldset disabled={loading} className="space-y-6">

            {!isLogin && !isForgotPassword && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ad</label>
                  <input
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Soyad</label>
                  <input
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Telefon</label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">E-posta Adresi</label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Şifre</label>
                  {isLogin && (
                    <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); }} className="text-sm font-medium text-green-600 hover:text-green-500">
                      Şifremi Unuttum
                    </button>
                  )}
                </div>
                <input
                  name="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>
            )}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 disabled:cursor-not-allowed items-center min-w-[150px]"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                {loading ? 'İşleniyor...' : isForgotPassword ? 'Sıfırlama Bağlantısı Gönder' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
              </button>
              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(''); }}
                  className="mt-4 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Giriş Ekranına Dön
                </button>
              )}
            </div>
            </fieldset>
          </form>

          {!isForgotPassword && (
            <>
              <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {isLogin ? (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Yeni Hesap Oluştur
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Giriş Yap
                  </>
                )}
              </button>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
