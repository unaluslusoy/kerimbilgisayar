import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { AlertCircle, CheckCircle2, LogIn, UserPlus, Loader2, Eye, EyeOff, Mail } from 'lucide-react';

type Mode = 'login' | 'register' | 'forgot';

export default function CustomerAuth() {
  const { isAuthenticated, login } = useCustomerAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/musteri/panel';
    return <Navigate to={from} replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorMsg('');
    setSuccessMsg('');
    setForgotSent(false);
  };

  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Zayıf', color: 'bg-red-500', width: '25%' };
    if (score === 2) return { label: 'Orta', color: 'bg-yellow-500', width: '50%' };
    if (score === 3) return { label: 'İyi', color: 'bg-blue-500', width: '75%' };
    return { label: 'Güçlü', color: 'bg-green-500', width: '100%' };
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'register') {
      if (formData.password.length < 8) return setErrorMsg('Şifre en az 8 karakter olmalıdır.');
      if (formData.password !== formData.passwordConfirm) return setErrorMsg('Şifreler eşleşmiyor.');
    }

    setLoading(true);
    try {
      if (mode === 'forgot') {
        await fetch('/api/customer/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });
        setForgotSent(true);
      } else if (mode === 'login') {
        const res = await fetch('/api/customer/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        
        let data;
        try {
          const text = await res.text();
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('Sunucu ile iletişim kurulamadı. Lütfen daha sonra tekrar deneyin.');
        }
        
        if (!res.ok) throw new Error(data?.error || 'Giriş yapılamadı');
        login(data.token, data.user);
        navigate('/musteri/panel');
      } else {
        const res = await fetch('/api/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
          }),
        });
        
        let data;
        try {
          const text = await res.text();
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('Sunucu ile iletişim kurulamadı. Lütfen daha sonra tekrar deneyin.');
        }
        
        if (!res.ok) throw new Error(data?.error || 'Kayıt olunamadı');
        setSuccessMsg('Hesabınız oluşturuldu! Şimdi giriş yapabilirsiniz.');
        setMode('login');
        setFormData(prev => ({ ...prev, password: '', passwordConfirm: '' }));
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 ' +
    'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent sm:text-sm transition-colors';

  const titleMap: Record<Mode, string> = {
    login: 'Müşteri Girişi',
    register: 'Hesap Oluştur',
    forgot: 'Şifremi Unuttum',
  };

  const passwordsMatch = formData.passwordConfirm !== '' && formData.password === formData.passwordConfirm;
  const passwordsMismatch = formData.passwordConfirm !== '' && formData.password !== formData.passwordConfirm;

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="text-center block text-3xl font-extrabold text-green-600 mb-2">
          Kerim Bilgisayar
        </Link>
        <h1 className="text-center text-2xl font-bold text-gray-900">{titleMap[mode]}</h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10">

          {errorMsg && (
            <div role="alert" className="mb-5 p-4 rounded-lg flex items-start gap-2 bg-red-50 text-red-700 border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div role="status" className="mb-5 p-4 rounded-lg flex items-start gap-2 bg-green-50 text-green-700 border border-green-100">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          )}

          {mode === 'forgot' && forgotSent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">E-posta gönderildi</h2>
              <p className="text-sm text-gray-600 mb-6">
                Bu adrese kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi.
                Gelen kutusu ve spam klasörünü kontrol et.
              </p>
              <button
                onClick={() => switchMode('login')}
                className="text-sm font-medium text-green-600 hover:text-green-700"
              >
                ← Giriş ekranına dön
              </button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <fieldset disabled={loading} className="space-y-5">

                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        Ad <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input id="firstName" name="firstName" type="text" autoComplete="given-name"
                        required value={formData.firstName} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Soyad <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input id="lastName" name="lastName" type="text" autoComplete="family-name"
                        required value={formData.lastName} onChange={handleChange} className={inputClass} />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Telefon <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input id="phone" name="phone" type="tel" autoComplete="tel" required
                        placeholder="05xx xxx xx xx" value={formData.phone} onChange={handleChange}
                        className={inputClass} />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    E-posta Adresi <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input id="email" name="email" type="email" autoComplete="email" required
                    value={formData.email} onChange={handleChange} className={inputClass} />
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Şifre <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => switchMode('forgot')}
                          className="text-xs font-medium text-green-600 hover:text-green-700">
                          Şifremi Unuttum
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input id="password" name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required minLength={8} value={formData.password} onChange={handleChange}
                        className={inputClass + ' pr-10'}
                        aria-describedby={mode === 'register' ? 'password-hint' : undefined} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {mode === 'register' && formData.password && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                            style={{ width: strength.width }} />
                        </div>
                        <p id="password-hint" className="mt-1 text-xs text-gray-500">
                          Güç: <span className="font-medium">{strength.label}</span>
                          {' · '}En az 8 karakter, büyük harf, rakam ve özel karakter önerilir.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {mode === 'register' && (
                  <div>
                    <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
                      Şifre Tekrar <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                      <input id="passwordConfirm" name="passwordConfirm"
                        type={showPasswordConfirm ? 'text' : 'password'}
                        autoComplete="new-password" required
                        value={formData.passwordConfirm} onChange={handleChange}
                        className={
                          inputClass + ' pr-10 ' +
                          (passwordsMismatch ? 'border-red-400 focus:ring-red-400' :
                           passwordsMatch ? 'border-green-400 focus:ring-green-400' : '')
                        } />
                      <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        aria-label={showPasswordConfirm ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                        {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordsMismatch && (
                      <p className="mt-1 text-xs text-red-600">Şifreler eşleşmiyor.</p>
                    )}
                    {passwordsMatch && (
                      <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Şifreler eşleşiyor.
                      </p>
                    )}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {loading ? 'İşleniyor...'
                    : mode === 'forgot' ? 'Sıfırlama Bağlantısı Gönder'
                    : mode === 'login' ? 'Giriş Yap'
                    : 'Hesap Oluştur'}
                </button>

                {mode === 'forgot' && (
                  <button type="button" onClick={() => switchMode('login')}
                    className="w-full text-sm text-center text-gray-600 hover:text-gray-800 mt-1">
                    ← Giriş ekranına dön
                  </button>
                )}

              </fieldset>
            </form>
          )}

          {mode !== 'forgot' && !forgotSent && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500">
                    {mode === 'login' ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
                  </span>
                </div>
              </div>
              <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="mt-4 w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                {mode === 'login'
                  ? <><UserPlus className="w-4 h-4" aria-hidden="true" /> Yeni Hesap Oluştur</>
                  : <><LogIn className="w-4 h-4" aria-hidden="true" /> Giriş Yap</>}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
