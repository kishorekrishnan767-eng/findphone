import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

interface Toast {
  id: number;
  message: string;
  isError: boolean;
}

const ToastContext = createContext<(message: string, opts?: { isError?: boolean }) => void>(() => {});

/** One toast at a time; a new one replaces the old. Info 4 s, errors 6 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const seq = useRef(0);

  const show = useCallback((message: string, opts?: { isError?: boolean }) => {
    seq.current += 1;
    setToast({ id: seq.current, message, isError: opts?.isError ?? false });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), toast.isError ? 6000 : 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-(--fp-z-toast) flex justify-center px-4">
        <div role={toast?.isError ? 'alert' : 'status'} aria-live={toast?.isError ? 'assertive' : 'polite'}>
          {toast && (
            <div
              key={toast.id}
              className="fp-enter max-w-100 rounded-md bg-inverse px-4 py-3 text-body text-on-inverse shadow-e3"
            >
              {toast.message}
            </div>
          )}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
