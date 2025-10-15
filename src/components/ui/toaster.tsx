"use client";

import { createContext, useContext, useRef, useState } from "react";

type ToastOpts = { title?: string; description?: string };
type ToastItem = ToastOpts & { id: number };

const ToastCtx = createContext<{ toast: (opts: ToastOpts) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  return (
    ctx || {
      toast: (opts: ToastOpts) => {
        const msg = opts.title || opts.description || "";
        if (msg) alert(msg);
      },
    }
  );
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  function toast(opts: ToastOpts) {
    const id = idRef.current++;
    const item = { id, ...opts };
    setItems((prev) => [...prev, item]);
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 3000);
  }

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {items.map((t) => (
          <div key={t.id} className="bg-background border rounded shadow px-3 py-2 text-sm">
            {t.title && <div className="font-medium">{t.title}</div>}
            {t.description && <div className="text-muted-foreground">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}