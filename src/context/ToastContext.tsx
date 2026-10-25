/* Brex Design System – High Contrast Toast Notification Engine */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title = 'Operation Successful') => addToast({ type: 'success', title, message }),
    [addToast]
  );

  const error = useCallback(
    (message: string, title = 'Attention Required') => addToast({ type: 'error', title, message, duration: 6000 }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, title = 'Warning') => addToast({ type: 'warning', title, message }),
    [addToast]
  );

  const info = useCallback(
    (message: string, title = 'Notice') => addToast({ type: 'info', title, message }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

/* --- TOAST CONTAINER & FLOATING TOAST CARDS --- */
interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const config = {
          success: {
            icon: CheckCircle2,
            iconClass: 'text-[#00875A]',
            badgeBg: 'bg-[#00875A]/10 border-[#00875A]/20',
            barBg: 'bg-[#00875A]',
          },
          error: {
            icon: AlertCircle,
            iconClass: 'text-[#DE350B]',
            badgeBg: 'bg-[#DE350B]/10 border-[#DE350B]/20',
            barBg: 'bg-[#DE350B]',
          },
          warning: {
            icon: AlertTriangle,
            iconClass: 'text-[#FF5900]',
            badgeBg: 'bg-[#FF5900]/10 border-[#FF5900]/20',
            barBg: 'bg-[#FF5900]',
          },
          info: {
            icon: Info,
            iconClass: 'text-[#006EF5]',
            badgeBg: 'bg-[#006EF5]/10 border-[#006EF5]/20',
            barBg: 'bg-[#006EF5]',
          },
        }[toast.type];

        const IconComponent = config.icon;

        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-[#FFFFFF] border border-[#B9BBC6] rounded-[8px] p-3.5 shadow-[0px_8px_24px_rgba(0,0,0,0.16)] flex items-start gap-3 transform transition-all duration-200 ease-out animate-in slide-in-from-bottom-2 fade-in"
            role="alert"
          >
            <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 border ${config.badgeBg}`}>
              <IconComponent className={`w-4 h-4 ${config.iconClass}`} />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-[14px] font-medium text-[#000000] leading-tight">{toast.title}</h4>
              {toast.message && (
                <p className="text-[12px] text-[#60646C] mt-0.5 leading-normal break-words">{toast.message}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-[#60646C] hover:text-[#000000] p-1 rounded hover:bg-[#F3F3F7] transition-colors shrink-0 -mr-1"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
