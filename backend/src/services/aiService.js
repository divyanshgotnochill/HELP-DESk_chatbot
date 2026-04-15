import { detectRelevantTopic, getKnowledgeBase, isCollegeRelated } from "./knowledgeService.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function buildContextSummary(topicData) {
  const summary = topicData.highlights?.join(" ") || "";
  const faqSummary = topicData.faqs
    ?.map((item) => `Q: ${item.question} A: ${item.answerEnglish} / ${item.answerHindi}`)
    .join(" ")
    || "";

  return `${summary} ${faqSummary}`.trim();
}

function buildMockReply(message, knowledgeBase) {
  if (!isCollegeRelated(message)) {
    return "I can help only with college-related questions such as admissions, fees, exams, results, scholarships, and office contacts. कृपया कॉलेज से जुड़ा प्रश्न पूछें।";
  }

  const topic = detectRelevantTopic(message) || "contacts";
  const topicData = knowledgeBase[topic];
  const words = message.toLowerCase().split(/\s+/);
  const match = topicData.faqs.find((faq) => words.some((word) => faq.question.toLowerCase().includes(word)));

  if (match) {
    return `${match.answerEnglish}\n\nहिंदी: ${match.answerHindi}`;
  }

  return `${topicData.defaultEnglish}\n\nहिंदी: ${topicData.defaultHindi}`;
}

async function generateGeminiReply(message, history, knowledgeBase) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const topic = detectRelevantTopic(message);
  const focusedContext = topic
    ? buildContextSummary(knowledgeBase[topic])
    : Object.values(knowledgeBase).map(buildContextSummary).join(" ");
  const recentHistory = history.slice(-6).map((item) => `${item.role}: ${item.content}`).join("\n");

  const prompt = `
You are a professional college helpdesk assistant for students.
Only answer questions related to this college's admissions, fees, exams, results, scholarships, office timings, contacts, and required documents.
If the question is outside this scope, politely refuse and redirect to college-related topics.
Reply in a friendly, concise style and include both English and Hindi in the same answer.

Knowledge base:
${focusedContext}

Conversation history:
${recentHistory}

Student question:
${message}
  `.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

export async function generateHelpdeskReply(message, history) {
  const knowledgeBase = await getKnowledgeBase();

  try {
    const geminiReply = await generateGeminiReply(message, history, knowledgeBase);
    if (geminiReply) {
      return geminiReply;
    }
  } catch (error) {
    console.warn("Falling back to mock reply:", error.message);
  }

  return buildMockReply(message, knowledgeBase);
}
