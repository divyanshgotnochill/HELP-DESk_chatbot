import { getKnowledgeBase, updateTopicFile } from "../services/knowledgeService.js";
import { createStudentAccount, listStudents } from "../services/authService.js";

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

export async function getStudents(_req, res, next) {
  try {
    const students = await listStudents();
    res.json({ students });
  } catch (error) {
    next(error);
  }
}

export async function createStudent(req, res, next) {
  try {
    const created = await createStudentAccount(req.body);
    res.status(201).json({
      message: "Student account created successfully.",
      ...created,
    });
  } catch (error) {
    next(error);
  }
}
