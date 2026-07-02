import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAppShell } from "../components/ToastProvider";
import { useAuth } from "../components/AuthProvider";

const demoUsers = [
  {
    role: "student",
    name: "Student Access",
    email: "student.abvv@gmail.com",
    password: "student123",
    description: "Chat with the AI helpdesk and browse FAQs.",
  },
  {
    role: "admin",
    name: "Admin Access",
    email: "admin.abvv@gmail.com",
    password: "admin123",
    description: "Manage helpdesk knowledge and all student features.",
  },
];

export default function LoginPage() {
  const { theme, toggleTheme, notify } = useAppShell();
  const { user, login, ready } = useAuth();
  const [form, setForm] = useState({
    email: demoUsers[0].email,
    password: demoUsers[0].password,
  });
  const [submitting, setSubmitting] = useState(false);

  if (ready && user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      const { user: nextUser } = await login(form);
      notify(`Welcome back, ${nextUser.name}.`);
    } catch (error) {
      notify(error.message || "Unable to sign in.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl gap-5 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="glass-panel overflow-hidden p-8 md:p-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-3xl font-semibold">Campus Assist</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Atal Bihari Vajpayee Vishwavidyalaya, Bilaspur
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>

          <div className="mt-10 space-y-5">
            <span className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
              Role-Based Access
            </span>
            <h1 className="max-w-xl font-display text-4xl font-semibold leading-tight">
              Secure student and admin access for the university AI helpdesk.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              Students can chat with the ABVV helpdesk, while admins can update the knowledge base and manage responses securely.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {demoUsers.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => setForm({ email: account.email, password: account.password })}
                className="rounded-[24px] border border-slate-200 bg-white/80 p-5 text-left shadow-soft transition hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-950/80"
              >
                <p className="font-display text-lg font-semibold">{account.name}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{account.description}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
                  {account.email}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-panel p-8 md:p-10">
          <p className="font-display text-2xl font-semibold">Sign in</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Use the seeded demo accounts or replace them in the backend storage.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
                placeholder="student.abvv@gmail.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
                placeholder="Enter password"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-8 rounded-[24px] bg-slate-100/80 p-5 text-sm text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Demo credentials</p>
            <p className="mt-3">Student: `student.abvv@gmail.com` / `student123`</p>
            <p className="mt-1">Admin: `admin.abvv@gmail.com` / `admin123`</p>
          </div>
        </section>
      </div>
    </div>
  );
}
