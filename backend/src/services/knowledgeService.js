import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../../data");

const topicFiles = {
  admission: "admission.json",
  fees: "fees.json",
  exams: "exams.json",
  scholarship: "scholarship.json",
  contacts: "contacts.json",
};

export async function getKnowledgeBase() {
  const entries = await Promise.all(
    Object.entries(topicFiles).map(async ([key, fileName]) => {
      const raw = await fs.readFile(path.join(dataDir, fileName), "utf-8");
      return [key, JSON.parse(raw)];
    }),
  );

  return Object.fromEntries(entries);
}

export async function updateTopicFile(topic, payload) {
  const fileName = topicFiles[topic];

  if (!fileName) {
    const error = new Error("Unknown topic.");
    error.status = 404;
    throw error;
  }

  const filePath = path.join(dataDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
  return payload;
}

export function detectRelevantTopic(message) {
  const normalized = message.toLowerCase();
  const mappings = [
    { topic: "admission", terms: ["admission", "apply", "eligibility", "document", "documents", "admit"] },
    { topic: "fees", terms: ["fee", "fees", "payment", "hostel", "tuition", "refund"] },
    { topic: "exams", terms: ["exam", "result", "schedule", "semester", "hall ticket", "dates"] },
    { topic: "scholarship", terms: ["scholarship", "financial aid", "grant", "waiver", "stipend"] },
    { topic: "contacts", terms: ["contact", "office", "timing", "hours", "phone", "email"] },
  ];

  const match = mappings.find(({ terms }) => terms.some((term) => normalized.includes(term)));
  return match?.topic || null;
}

export function isCollegeRelated(message) {
  return Boolean(detectRelevantTopic(message)) || /(college|university|campus|student|admission|fees|exam|result|scholarship|office)/i.test(message);
}
