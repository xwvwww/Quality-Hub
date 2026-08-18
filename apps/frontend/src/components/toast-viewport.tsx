'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

type Toast = { id: string; message: string; kind: 'error' | 'success' };
let toastSequence = 0;

export function notify(message: string, kind: Toast['kind'] = 'success') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('quality-hub-toast', { detail: { message, kind } }));
  }
}

export function ToastViewport() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<Omit<Toast, 'id'>>).detail;
      const id = `${Date.now()}-${++toastSequence}`;
      setItems((current) => [...current.slice(-3), { id, ...detail }]);
      window.setTimeout(() => setItems((current) => current.filter((toast) => toast.id !== id)), 4500);
    };
    window.addEventListener('quality-hub-toast', handleToast);
    return () => window.removeEventListener('quality-hub-toast', handleToast);
  }, []);

  return <div className="fixed right-6 bottom-6 z-[100] space-y-2 w-96 max-w-[90vw]">
    {items.map((toast) => <div className={`card p-4 flex gap-3 items-start shadow-2xl border-l-4 ${toast.kind === 'error' ? 'border-l-red-500' : 'border-l-green-500'}`} key={toast.id}>
      {toast.kind === 'error' ? <AlertCircle className="text-red-500 shrink-0" /> : <CheckCircle2 className="text-green-500 shrink-0" />}
      <p className="text-sm m-0 flex-1">{toast.message}</p>
      <button aria-label="Закрыть уведомление" className="icon-btn p-0" onClick={() => setItems((current) => current.filter((item) => item.id !== toast.id))}><X size={15} /></button>
    </div>)}
  </div>;
}
