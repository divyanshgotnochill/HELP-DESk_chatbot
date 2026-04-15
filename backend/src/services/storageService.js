import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageDir = path.resolve(__dirname, "../../storage");
const feedbackFile = path.join(storageDir, "feedback.json");

async function ensureStorage() {
  await fs.mkdir(storageDir, { recursive: true });
  try {
    await fs.access(feedbackFile);
  } catch {
    await fs.writeFile(feedbackFile, "[]");
  }
}

export async function appendFeedback(entry) {
  await ensureStorage();
  const raw = await fs.readFile(feedbackFile, "utf-8");
  const current = JSON.parse(raw);
  const nextEntry = { id: Date.now().toString(), ...entry };
  current.push(nextEntry);
  await fs.writeFile(feedbackFile, JSON.stringify(current, null, 2));
  return nextEntry;
}
