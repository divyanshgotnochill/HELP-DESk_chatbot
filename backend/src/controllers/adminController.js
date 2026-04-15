import { getKnowledgeBase, updateTopicFile } from "../services/knowledgeService.js";

export async function getTopics(_req, res, next) {
  try {
    const topics = await getKnowledgeBase();
    res.json({ topics });
  } catch (error) {
    next(error);
  }
}

export async function updateTopic(req, res, next) {
  try {
    const { topic } = req.params;
    const payload = req.body;
    const updated = await updateTopicFile(topic, payload);
    res.json({ message: "Topic updated.", topic: updated });
  } catch (error) {
    next(error);
  }
}
