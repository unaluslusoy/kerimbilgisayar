import { Monitor, Phone, Mail, MapPin, Wrench } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col font-sans">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
        .animate-fade-in-up-delay { animation: fade-in-up 0.8s ease-out 0.2s forwards; opacity: 0; }
        .animate-fade-in-up-delay-2 { animation: fade-in-up 0.8s ease-out 0.4s forwards; opacity: 0; }
        .animate-fade-in-up-delay-3 { animation: fade-in-up 0.8s ease-out 0.6s forwards; opacity: 0; }
      `}</style>

      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-100 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-50 rounded-full blur-3xl opacity-20"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-6">
        <div className="max-w-6xl mx-auto flex justify-center">
          <img
            src="https://kerimbilgisayar.com/assets/images/kerim-logo.svg"
            alt="Kerim Bilgisayar"
            className="h-14 sm:h-16 w-auto object-contain"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-2xl w-full text-center">
          
          {/* Icon */}
          <div className="animate-fade-in-up mb-8">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute w-28 h-28 rounded-full bg-green-100 animate-pulse-ring"></div>
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-xl shadow-green-200 animate-float">
                <Wrench className="w-11 h-11 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="animate-fade-in-up-delay text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5 leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Sistem Geçici Olarak
            <span className="block text-green-600">Bakımdadır</span>
          </h1>

          {/* Description */}
          <p className="animate-fade-in-up-delay-2 text-base sm:text-lg text-gray-500 max-w-lg mx-auto mb-10 leading-relaxed">
            Sizlere daha iyi hizmet verebilmek amacıyla sistemlerimizde bakım çalışması yürütülmektedir. 
            Yazılım ekibimiz tarafından sorun en kısa sürede çözümlenecektir. 
            Anlayışınız için teşekkür ederiz.
          </p>

          {/* Status badge */}
          <div className="animate-fade-in-up-delay-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold mb-12">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></div>
            Bakım Çalışması Devam Ediyor
          </div>

          {/* Contact cards */}
          <div className="animate-fade-in-up-delay-3 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
            <a
              href="tel:+902125550000"
              className="group flex flex-col items-center gap-2 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-green-200 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs text-gray-400 font-medium">Telefon</span>
              <span className="text-sm font-semibold text-gray-700">Bizi Arayın</span>
            </a>

            <a
              href="mailto:bilgi@kerimbilgisayar.com"
              className="group flex flex-col items-center gap-2 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-green-200 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-400 font-medium">E-posta</span>
              <span className="text-sm font-semibold text-gray-700">Yazın Bize</span>
            </a>

            <div className="group flex flex-col items-center gap-2 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="w-11 h-11 rounded-full bg-purple-50 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs text-gray-400 font-medium">Adres</span>
              <span className="text-sm font-semibold text-gray-700">İstanbul</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-6 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Kerim Bilgisayar. Tüm hakları saklıdır.
        </p>
      </footer>
    </div>
  );
}
