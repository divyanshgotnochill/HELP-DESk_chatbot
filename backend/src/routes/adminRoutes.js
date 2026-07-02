import { Router } from "express";
import { createStudent, getStudents, getTopics, updateTopic } from "../controllers/adminController.js";

const router = Router();

router.get("/topics", getTopics);
router.put("/topics/:topic", updateTopic);
router.get("/students", getStudents);
router.post("/students", createStudent);

export default router;
