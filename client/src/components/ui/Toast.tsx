import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Icon } from './Icon';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg border font-family-geist text-[12px] font-medium pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              t.type === 'success'
                ? 'bg-(--color-surface-container-lowest) border-(--color-secondary-container) text-(--color-on-surface)'
                : t.type === 'error'
                ? 'bg-(--color-error-container) border-(--color-error-container) text-(--color-on-error-container)'
                : 'bg-(--color-surface-container-lowest) border-(--color-surface-container-high) text-(--color-on-surface)'
            }`}
          >
            <Icon name={t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'} size={16} className={t.type === 'success' ? 'text-(--color-primary)' :
              t.type === 'error' ? 'text-(--color-error)' :
              'text-(--color-secondary)'} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
