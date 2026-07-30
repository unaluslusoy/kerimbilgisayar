import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((t) => {
          let bgClass = 'bg-white text-gray-800 border-gray-100';
          let Icon = Info;
          let iconColor = 'text-blue-500';

          if (t.type === 'success') {
            bgClass = 'bg-emerald-500 text-white border-transparent';
            Icon = CheckCircle2;
            iconColor = 'text-white';
          } else if (t.type === 'error') {
            bgClass = 'bg-rose-500 text-white border-transparent';
            Icon = AlertCircle;
            iconColor = 'text-white';
          } else if (t.type === 'warning') {
            bgClass = 'bg-amber-500 text-white border-transparent';
            Icon = AlertCircle;
            iconColor = 'text-white';
          }

          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl transition-all duration-300 pointer-events-auto animate-in slide-in-from-bottom-5 w-full ${bgClass}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
              <div className="flex-1 text-sm font-semibold">{t.message}</div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-0.5 hover:bg-black/10 rounded-lg text-current/60 hover:text-current transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
