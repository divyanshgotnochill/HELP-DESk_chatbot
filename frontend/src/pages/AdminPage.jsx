import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAppShell } from "../components/ToastProvider";

export default function AdminPage() {
  const { theme, toggleTheme, notify } = useAppShell();
  const [topics, setTopics] = useState({});
  const [selectedTopic, setSelectedTopic] = useState("admission");
  const [editorValue, setEditorValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getTopics()
      .then((data) => {
        setTopics(data.topics);
        const firstTopic = Object.keys(data.topics)[0];
        setSelectedTopic(firstTopic);
        setEditorValue(JSON.stringify(data.topics[firstTopic], null, 2));
      })
      .catch(() => notify("Failed to load knowledge base.", "error"));
  }, [notify]);

  useEffect(() => {
    if (selectedTopic && topics[selectedTopic]) {
      setEditorValue(JSON.stringify(topics[selectedTopic], null, 2));
    }
  }, [selectedTopic, topics]);

  async function saveTopic() {
    try {
      setSaving(true);
      const parsed = JSON.parse(editorValue);
      await api.updateTopic(selectedTopic, parsed);
      setTopics((current) => ({ ...current, [selectedTopic]: parsed }));
      notify("Knowledge base updated successfully.");
    } catch (error) {
      notify(error.message || "Invalid JSON or save failed.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-3 py-3 md:px-5 md:py-5">
      <div className="glass-panel mx-auto max-w-6xl overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200/70 p-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-2xl font-semibold">Admin Knowledge Editor</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Update FAQs and default responses for the college helpdesk.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <Link
              to="/"
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-sky-500"
            >
              Back to chat
            </Link>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[240px,1fr]">
          <aside className="space-y-2">
            {Object.keys(topics).map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`w-full rounded-2xl px-4 py-3 text-left font-semibold transition ${
                  selectedTopic === topic
                    ? "bg-gradient-to-r from-sky-500 to-emerald-400 text-white"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {topic}
              </button>
            ))}
          </aside>

          <section className="rounded-[24px] bg-slate-100/80 p-4 dark:bg-slate-900/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold capitalize">{selectedTopic}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Edit JSON safely and save to the backend data store.
                </p>
              </div>
              <button
                type="button"
                onClick={saveTopic}
                disabled={saving || !selectedTopic}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-emerald-500"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>

            <textarea
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              className="mt-4 min-h-[68vh] w-full rounded-[24px] border border-slate-200 bg-white p-4 font-mono text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
