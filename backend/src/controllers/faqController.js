import { getKnowledgeBase } from "../services/knowledgeService.js";

export async function getFaqs(_req, res, next) {
  try {
    const knowledgeBase = await getKnowledgeBase();
    const faqs = Object.values(knowledgeBase).flatMap((topic) => topic.faqs);
    res.json({ topics: knowledgeBase, faqs });
  } catch (error) {
    next(error);
  }
}
