const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
  updateTopic: (topic, body) =>
    request(`/api/admin/topics/${topic}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
