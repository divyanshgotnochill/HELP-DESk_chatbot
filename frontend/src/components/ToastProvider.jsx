import { createContext, useContext, useMemo, useState } from "react";

const ToastContext = createContext({ notify: () => {}, theme: "dark", toggleTheme: () => {} });

export function ToastProvider({ children, appContext }) {
  const [toasts, setToasts] = useState([]);

  const value = useMemo(
    () => ({
      ...appContext,
      notify: (message, type = "info") => {
        const id = Date.now().toString();
        setToasts((current) => [...current, { id, message, type }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 2600);
      },
    }),
    [appContext],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 text-sm shadow-soft backdrop-blur ${
              toast.type === "error"
                ? "border-rose-200 bg-rose-50/95 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/80 dark:text-rose-100"
                : "border-emerald-200 bg-white/95 text-slate-700 dark:border-emerald-500/30 dark:bg-slate-900/90 dark:text-slate-100"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useAppShell() {
  return useContext(ToastContext);
}
