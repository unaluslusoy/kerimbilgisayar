import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TurnstileWidget from '../../components/TurnstileWidget';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [captchaSettings, setCaptchaSettings] = useState({ enabled: false, siteKey: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password, remember, turnstileToken);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız. Bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/public/settings')
      .then(res => res.json())
      .then(data => setCaptchaSettings({ enabled: data?.captchaEnabled === 'true', siteKey: data?.turnstileSiteKey || '' }))
      .catch(() => null);
  }, []);

  return (
    <div className="admin-panel min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -ml-[400px] w-[800px] h-[800px] bg-green-900/20 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center">
          <img 
            src="/assets/images/kerim-logo-beyaz.svg" 
            alt="Kerim Bilgisayar" 
            className="h-16 w-auto object-contain mb-4"
          />
          <p className="text-center text-sm text-gray-400">
            Yetkili Yönetim Paneli Girişi
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-gray-900 py-8 px-4 shadow-2xl sm:rounded-theme sm:px-10 border border-gray-800">
          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-700/50 rounded-theme px-4 py-3 flex items-center gap-3 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <fieldset disabled={isLoading} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                E-Posta Adresi
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-700 rounded-theme bg-gray-950 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-60"
                  placeholder="yonetici@kerimbilgisayar.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Şifre
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-700 rounded-theme bg-gray-950 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-60"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-gray-700 bg-gray-950 text-primary focus:ring-primary"
              />
              Beni hatırla
            </label>

            <TurnstileWidget enabled={captchaSettings.enabled} siteKey={captchaSettings.siteKey} onVerify={setTurnstileToken} />

            <div>
              <button
                type="submit"
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-theme shadow-sm text-sm font-bold text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-gray-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" />Giriş yapılıyor...</>
                ) : (
                  <>Sisteme Giriş Yap <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </div>

            <div className="mt-6 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
              Bu alan sadece sistem yetkilileri tarafından kullanılabilir. İzinsiz erişim girişimleri loglanmaktadır.
            </div>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}
