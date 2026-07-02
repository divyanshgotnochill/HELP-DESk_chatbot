const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const AUTH_STORAGE_KEY = "campus-assist-auth";

function getAuthToken() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw).token || null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export const api = {
  login: (body) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getMe: () => request("/api/auth/me"),
  sendMessage: (body) =>
    request("/api/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getFaqs: () => request("/api/faqs"),
  postFeedback: (body) =>
    request("/api/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getTopics: () => request("/api/admin/topics"),
  getStudents: () => request("/api/admin/students"),
  createStudent: (body) =>
    request("/api/admin/students", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateTopic: (topic, body) =>
    request(`/api/admin/topics/${topic}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
