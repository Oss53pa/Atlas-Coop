import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; message: string }

const ToastCtx = createContext<{
  push: (kind: ToastKind, message: string) => void;
}>({ push: () => {} });

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertTriangle : Info;
          const tone =
            t.kind === 'success'
              ? 'border-action/30 bg-action/10 text-action'
              : t.kind === 'error'
                ? 'border-alerte/30 bg-alerte/10 text-alerte'
                : 'border-primaire/30 bg-primaire/10 text-primaire';
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-2.5 rounded-xl border bg-surface px-4 py-3 shadow-carte-hover animate-slide-up',
                tone,
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm text-texte">{t.message}</p>
              <button onClick={() => remove(t.id)} className="text-texte-2 hover:text-texte">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
