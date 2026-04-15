import { generateHelpdeskReply } from "../services/aiService.js";

export async function postChat(req, res, next) {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "A message is required." });
    }

    const reply = await generateHelpdeskReply(message, history);
    return res.json({ reply });
  } catch (error) {
    return next(error);
  }
}
