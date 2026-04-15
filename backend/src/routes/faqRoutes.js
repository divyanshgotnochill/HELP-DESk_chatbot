import { Router } from "express";
import { getFaqs } from "../controllers/faqController.js";

const router = Router();

router.get("/", getFaqs);

export default router;
