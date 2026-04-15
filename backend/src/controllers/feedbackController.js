import { appendFeedback } from "../services/storageService.js";

export async function postFeedback(req, res, next) {
  try {
    const { rating, comment = "", conversationId = "" } = req.body;

    if (!rating) {
      return res.status(400).json({ error: "Rating is required." });
    }

    const entry = await appendFeedback({
      rating,
      comment,
      conversationId,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      message: "Feedback stored successfully.",
      feedback: entry,
    });
  } catch (error) {
    return next(error);
  }
}
