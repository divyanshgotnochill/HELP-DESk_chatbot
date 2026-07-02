import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAppShell } from "../components/ToastProvider";
import { useAuth } from "../components/AuthProvider";
import universityLogo from "/logo1068884560788.webp";

const CHAT_STORAGE_KEY = "campus-assist-conversations";
const quickActions = ["Admission", "Fees", "Results", "Documents", "Scholarship"];
const officialLinks = [
  { label: "Official Website", href: "https://www.bilaspuruniversity.ac.in/" },
  { label: "Campus Contact", href: "https://www.bilaspuruniversity.ac.in/" },
  { label: "Student Notices", href: "https://www.bilaspuruniversity.ac.in/" },
];

function TrashIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5.75A1.75 1.75 0 0 1 10.75 4h2.5A1.75 1.75 0 0 1 15 5.75V7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.75 7l.7 10.53A2 2 0 0 0 10.44 19.5h3.12a2 2 0 0 0 1.99-1.97L16.25 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 10.5v5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10.5v5" />
    </svg>
  );
}

function createConversation() {
  return {
    id: Date.now().toString(),
    title: "New conversation",
    createdAt: new Date().toISOString(),
    messages: [
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Welcome to Campus Assist for Atal Bihari Vajpayee Vishwavidyalaya, Bilaspur. Ask me about admissions, documents, fees, exams, results, scholarships, or office contacts.\n\nकृपया एबीवीवी बिलासपुर से जुड़ा कोई भी प्रश्न पूछें।",
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

function createInitialConversationSet() {
  return [createConversation()];
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ChatPage() {
  const { theme, toggleTheme, notify } = useAppShell();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState(() => {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : createInitialConversationSet();
  });
  const [activeId, setActiveId] = useState(() => {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed[0]?.id || null;
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [faqState, setFaqState] = useState({ faqs: [], topics: {} });
  const [search, setSearch] = useState("");
  const viewportRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) || conversations[0],
    [activeId, conversations],
  );

  useEffect(() => {
    if (!activeId && conversations[0]) {
      setActiveId(conversations[0].id);
    }
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations));
  }, [activeId, conversations]);

  useEffect(() => {
    api
      .getFaqs()
      .then(setFaqState)
      .catch((error) => notify(error.message || "Unable to load FAQs right now.", "error"));
  }, [notify]);

  useEffect(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeConversation?.messages, loading]);

  const filteredFaqs = useMemo(() => {
    return faqState.faqs.filter((item) =>
      `${item.question} ${item.answerEnglish} ${item.answerHindi}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [faqState.faqs, search]);

  async function sendMessage(text = message) {
    const trimmed = text.trim();
    if (!trimmed || !activeConversation || loading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextConversation = {
      ...activeConversation,
      title: activeConversation.title === "New conversation" ? trimmed.slice(0, 30) : activeConversation.title,
      messages: [...activeConversation.messages, userMessage],
    };

    setConversations((current) => current.map((item) => (item.id === nextConversation.id ? nextConversation : item)));
    setMessage("");
    setLoading(true);

    try {
      const { reply } = await api.sendMessage({
        message: trimmed,
        history: nextConversation.messages.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
      });

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };

      setConversations((current) =>
        current.map((item) =>
          item.id === nextConversation.id
            ? { ...nextConversation, messages: [...nextConversation.messages, assistantMessage] }
            : item,
        ),
      );
    } catch (error) {
      if (error.message === "Authentication required.") {
        logout();
        navigate("/login", { replace: true });
      }
      notify(error.message || "Failed to send message.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback(rating) {
    if (!activeConversation) return;
    try {
      await api.postFeedback({
        rating,
        conversationId: activeConversation.id,
        comment: `Feedback from ${activeConversation.title}`,
      });
      notify("Thanks for your feedback.");
    } catch {
      notify("Could not save feedback.", "error");
    }
  }

  function addConversation() {
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
  }

  function deleteConversation(conversationId) {
    setConversations((current) => {
      const nextConversations = current.filter((item) => item.id !== conversationId);
      const safeConversations = nextConversations.length > 0 ? nextConversations : createInitialConversationSet();
      const currentActiveExists = safeConversations.some((item) => item.id === activeId);
      setActiveId(currentActiveExists ? activeId : safeConversations[0].id);
      return safeConversations;
    });
    notify("Conversation deleted.");
  }

  function clearAllConversations() {
    const nextConversations = createInitialConversationSet();
    setConversations(nextConversations);
    setActiveId(nextConversations[0].id);
    notify("All conversations cleared.");
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen px-3 py-3 md:px-5 md:py-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl gap-4 lg:grid-cols-[320px,1fr]">
        <aside className="glass-panel flex flex-col overflow-hidden">
          <div className="border-b border-slate-200/70 p-5 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-semibold">Campus Assist</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Atal Bihari Vajpayee Vishwavidyalaya, Bilaspur
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
                  {user?.role} access
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300"
                >
                  Logout
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={addConversation}
              className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-400"
            >
              New conversation
            </button>
            <button
              type="button"
              onClick={clearAllConversations}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-200"
            >
              Delete all conversations
            </button>
          </div>

          <div className="scrollbar flex-1 space-y-2 overflow-y-auto p-3">
            {conversations.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl p-2 transition ${
                  item.id === activeId
                    ? "bg-slate-900 text-white dark:bg-sky-500"
                    : "bg-white/70 text-slate-700 hover:bg-slate-100 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className="min-w-0 flex-1 px-2 pb-2 pt-2 text-left"
                  >
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs opacity-70">{new Date(item.createdAt).toLocaleDateString("en-IN")}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConversation(item.id)}
                    aria-label={`Delete conversation ${item.title}`}
                    title="Delete conversation"
                    className={`mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                      item.id === activeId
                        ? "border-white/25 text-white hover:bg-white/10"
                        : "border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200/70 p-4 dark:border-slate-800">
            {user?.role === "admin" ? (
              <Link
                to="/admin"
                className="block rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-200"
              >
                Admin knowledge editor
              </Link>
            ) : (
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                Student mode: admin tools are hidden.
              </div>
            )}
          </div>
        </aside>

        <main className="glass-panel grid min-h-[80vh] overflow-hidden lg:grid-cols-[1fr,320px]">
          <section className="flex min-h-0 flex-col">
            <header className="border-b border-slate-200/70 px-5 py-5 dark:border-slate-800">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 animate-float items-center justify-center rounded-[22px] border border-slate-200/70 bg-white p-2 shadow-soft dark:border-slate-700 dark:bg-slate-950">
                    <img
                      src={universityLogo}
                      alt="Atal Bihari Vajpayee Vishwavidyalaya logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-semibold">Student AI HelpDesk</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      ABVV Bilaspur support for admissions, fees, results, scholarships, documents, and notices
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => sendMessage(`Tell me about ${action.toLowerCase()}.`)}
                      className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </header>

            <div ref={viewportRef} className="scrollbar flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-6">
              {activeConversation?.messages.map((entry) => (
                <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-2xl rounded-[26px] px-5 py-4 shadow-soft ${
                      entry.role === "user"
                        ? "bg-slate-900 text-white dark:bg-sky-500"
                        : "bg-white/90 text-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-7">{entry.content}</p>
                    <p className={`mt-3 text-[11px] ${entry.role === "user" ? "text-white/70" : "text-slate-400"}`}>
                      {formatTime(entry.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-[26px] bg-white/90 px-5 py-4 shadow-soft dark:bg-slate-900/90">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.2s]" />
                      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.1s]" />
                      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-slate-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200/70 p-4 dark:border-slate-800">
              <div className="rounded-[28px] border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex gap-3">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={2}
                    placeholder="Ask about ABVV admission process, documents, fees, results, scholarships..."
                    className="min-h-[56px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    className="rounded-2xl dark:bg-white dark:text-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Send
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <p>Supports English and Hindi queries.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => submitFeedback("helpful")} className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                      Helpful
                    </button>
                    <button type="button" onClick={() => submitFeedback("needs-improvement")} className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                      Improve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="border-t border-slate-200/70 p-4 dark:border-slate-800 lg:border-l lg:border-t-0">
            <div className="rounded-[24px] bg-slate-100/80 p-4 dark:bg-slate-900/80">
              <div className="mb-4 rounded-2xl bg-white/80 p-4 dark:bg-slate-950/80">
                <p className="font-display text-base font-semibold">ABVV Bilaspur</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Bilaspur-Ratanpur Road, Koni, Bilaspur, Chhattisgarh 495009
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Official phone: 8889928648
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {officialLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:text-slate-200"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
              <p className="font-display text-lg font-semibold">FAQ Explorer</p>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search FAQs..."
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
              />
              <div className="scrollbar mt-4 space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-17rem)]">
                {filteredFaqs.map((faq) => (
                  <button
                    key={faq.question}
                    type="button"
                    onClick={() => sendMessage(faq.question)}
                    className="w-full rounded-2xl bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-soft dark:bg-slate-950"
                  >
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{faq.question}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{faq.answerEnglish}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
