import { Router } from "express";
import { getTopics, updateTopic } from "../controllers/adminController.js";

const router = Router();

router.get("/topics", getTopics);
router.put("/topics/:topic", updateTopic);

export default router;
