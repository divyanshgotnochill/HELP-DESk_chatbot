import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAppShell } from "../components/ToastProvider";
import { useAuth } from "../components/AuthProvider";

const initialStudentForm = {
  name: "",
  email: "",
  enrollmentNumber: "",
  admissionYear: new Date().getFullYear().toString(),
};

export default function AdminPage() {
  const { theme, toggleTheme, notify } = useAppShell();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState({});
  const [selectedTopic, setSelectedTopic] = useState("admission");
  const [editorValue, setEditorValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [lastCreatedStudent, setLastCreatedStudent] = useState(null);

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

    api
      .getStudents()
      .then((data) => setStudents(data.students))
      .catch((error) => notify(error.message || "Failed to load students.", "error"));
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

  async function handleCreateStudent(event) {
    event.preventDefault();
    try {
      setCreatingStudent(true);
      const data = await api.createStudent(studentForm);
      setStudents((current) => [data.user, ...current].sort((left, right) => right.studentId.localeCompare(left.studentId)));
      setLastCreatedStudent(data);
      setStudentForm(initialStudentForm);
      notify(`Student ID ${data.user.studentId} created successfully.`);
    } catch (error) {
      notify(error.message || "Failed to create student account.", "error");
    } finally {
      setCreatingStudent(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen px-3 py-3 md:px-5 md:py-5">
      <div className="glass-panel mx-auto max-w-7xl overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200/70 p-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-2xl font-semibold">Admin Console</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Signed in as {user?.name} ({user?.role}). Manage student IDs and the ABVV helpdesk knowledge base.
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
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[1.15fr,1fr]">
          <section className="space-y-4">
            <div className="rounded-[24px] bg-slate-100/80 p-4 dark:bg-slate-900/80">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">Create Student ID</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Use the student's registered personal email. The system auto-generates an ABVV student ID.
                  </p>
                </div>
                <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Admin only
                </div>
              </div>

              <form onSubmit={handleCreateStudent} className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Student Name</span>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(event) => setStudentForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Rahul Sharma"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Registered Email</span>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(event) => setStudentForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="rahulsharma12@gmail.com"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Enrollment Number</span>
                  <input
                    type="text"
                    value={studentForm.enrollmentNumber}
                    onChange={(event) => setStudentForm((current) => ({ ...current, enrollmentNumber: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="23014567"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Admission Year</span>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={studentForm.admissionYear}
                    onChange={(event) => setStudentForm((current) => ({ ...current, admissionYear: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
                    required
                  />
                </label>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={creatingStudent}
                    className="rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {creatingStudent ? "Creating student..." : "Create student account"}
                  </button>
                </div>
              </form>

              {lastCreatedStudent && (
                <div className="mt-5 rounded-[24px] bg-white/90 p-5 shadow-soft dark:bg-slate-950/80">
                  <p className="font-display text-lg font-semibold">Latest created student</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <p><span className="font-semibold text-slate-800 dark:text-slate-100">Name:</span> {lastCreatedStudent.user.name}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-100">Student ID:</span> {lastCreatedStudent.user.studentId}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-100">Email:</span> {lastCreatedStudent.user.email}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-100">Temporary Password:</span> {lastCreatedStudent.tempPassword}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[24px] bg-slate-100/80 p-4 dark:bg-slate-900/80">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">Student Directory</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Students can log in with their registered email and the temporary password shared by admin.
                  </p>
                </div>
                <div className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                  {students.length} students
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-[1.15fr,1fr,0.75fr] gap-3 bg-slate-200/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span>Name</span>
                  <span>Student ID</span>
                  <span>Year</span>
                </div>
                <div className="divide-y divide-slate-200 bg-white/90 dark:divide-slate-800 dark:bg-slate-950/80">
                  {students.map((student) => (
                    <div key={student.email} className="grid grid-cols-[1.15fr,1fr,0.75fr] gap-3 px-4 py-4 text-sm">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{student.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{student.email}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{student.studentId || "Not assigned"}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{student.enrollmentNumber || "No enrollment number"}</p>
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{student.admissionYear || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] bg-slate-100/80 p-4 dark:bg-slate-900/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold capitalize">{selectedTopic}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Edit helpdesk JSON safely and save changes to the backend data store.
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

            <div className="mt-4 grid gap-4 lg:grid-cols-[220px,1fr]">
              <aside className="space-y-2">
                {Object.keys(topics).map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setSelectedTopic(topic)}
                    className={`w-full rounded-2xl px-4 py-3 text-left font-semibold transition ${
                      selectedTopic === topic
                        ? "bg-gradient-to-r from-sky-500 to-emerald-400 text-white"
                        : "bg-white text-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </aside>

              <textarea
                value={editorValue}
                onChange={(event) => setEditorValue(event.target.value)}
                className="min-h-[72vh] w-full rounded-[24px] border border-slate-200 bg-white p-4 font-mono text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
