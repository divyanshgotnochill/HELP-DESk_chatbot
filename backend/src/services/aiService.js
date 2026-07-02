import { getKnowledgeBase, isCollegeRelated } from "./knowledgeService.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_HISTORY_MESSAGES = 6;
const RETRIEVAL_LIMIT = 6;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "for",
  "from",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "please",
  "tell",
  "the",
  "this",
  "to",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "you",
]);

const TOPIC_KEYWORDS = {
  admission: ["admission", "apply", "application", "applying", "merit", "counselling", "verification"],
  fees: ["fee", "fees", "payment", "refund", "tuition", "hostel"],
  exams: ["exam", "result", "semester", "hall", "timetable", "schedule", "marks"],
  scholarship: ["scholarship", "stipend", "waiver", "financial", "grant"],
  contacts: ["contact", "phone", "email", "office", "hod", "coordinator", "incharge", "in-charge", "helpline"],
  curriculum: ["syllabus", "subject", "course", "curriculum", "timetable", "class"],
  rules: ["attendance", "rule", "rules", "discipline", "lab", "practical", "viva", "shortage"],
};

const INTENT_PATTERNS = {
  contact: /\b(who|contact|phone|email|mail|number|helpline|incharge|in-charge|responsible|handles?|coordinator|hod)\b/i,
  issue: /\b(problem|issue|error|stuck|trouble|unable|cannot|can't|failed|fail|not working|payment failed|form issue|portal issue)\b/i,
  dates: /\b(when|date|dates|start|begin|open|close|closing|last date|deadline|timeline|schedule)\b/i,
  documents: /\b(document|documents|certificate|marksheet|upload|required|required docs)\b/i,
  process: /\b(process|procedure|how to|steps|apply|application process|registration)\b/i,
  location: /\b(where|located|address|location)\b/i,
  timing: /\b(timing|timings|hours|open|close|working hours)\b/i,
  negative: /\b(don't|do not|dont|not asking|no need|not needed|avoid|other than|except)\b/i,
};

const INTENT_OPTIONS = {
  admission: ["admission process", "required documents", "important dates", "form issue", "contact person"],
  fees: ["fee structure", "payment issue", "refund", "fee deadline"],
  exams: ["exam schedule", "results", "hall ticket", "marks issue"],
  scholarship: ["eligibility", "application process", "required documents", "status"],
  contacts: ["contact person", "office timing", "department location", "email or helpline"],
  curriculum: ["syllabus", "course list", "class schedule"],
  rules: ["attendance", "lab rules", "discipline", "practical or viva rules"],
};

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && token.length > 1 && !STOPWORDS.has(token));
}

function uniqueTokens(value) {
  return [...new Set(tokenize(value))];
}

function detectTopicMentions(text) {
  const normalized = normalizeText(text);
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([topic]) => topic);
}

function buildKnowledgeEntries(knowledgeBase) {
  const entries = [];

  for (const [topic, topicData] of Object.entries(knowledgeBase)) {
    entries.push({
      id: `${topic}:default`,
      topic,
      type: "default",
      question: topicData.title,
      answerEnglish: topicData.defaultEnglish,
      answerHindi: topicData.defaultHindi,
      searchText: `${topicData.title} ${topicData.defaultEnglish} ${topicData.defaultHindi} ${(topicData.highlights || []).join(" ")}`,
    });

    (topicData.highlights || []).forEach((highlight, index) => {
      entries.push({
        id: `${topic}:highlight:${index}`,
        topic,
        type: "highlight",
        question: topicData.title,
        answerEnglish: highlight,
        answerHindi: "",
        searchText: `${topicData.title} ${highlight}`,
      });
    });

    (topicData.faqs || []).forEach((faq, index) => {
      entries.push({
        id: `${topic}:faq:${index}`,
        topic,
        type: "faq",
        question: faq.question,
        answerEnglish: faq.answerEnglish,
        answerHindi: faq.answerHindi,
        searchText: `${faq.question} ${faq.answerEnglish} ${faq.answerHindi}`,
      });
    });
  }

  return entries;
}

function buildConversationContext(history) {
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
  const recentUserMessages = recentHistory.filter((entry) => entry.role === "user").map((entry) => entry.content);
  const previousUserMessage = recentUserMessages.at(-1) || "";
  const previousAssistantMessage = recentHistory.filter((entry) => entry.role === "assistant").map((entry) => entry.content).at(-1) || "";

  const topicVotes = {};
  for (const entry of recentHistory) {
    for (const topic of detectTopicMentions(entry.content || "")) {
      topicVotes[topic] = (topicVotes[topic] || 0) + 1;
    }
  }

  const dominantTopic = Object.entries(topicVotes).sort((left, right) => right[1] - left[1])[0]?.[0] || null;

  return {
    recentHistory,
    previousUserMessage,
    previousAssistantMessage,
    dominantTopic,
  };
}

function analyzeIntent(message, conversationContext) {
  const topicMentions = detectTopicMentions(message);
  const negativeTopics = new Set();
  const normalized = normalizeText(message);

  if (INTENT_PATTERNS.negative.test(message)) {
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        negativeTopics.add(topic);
      }
    }
  }

  const referential = /\b(it|that|this|those|they|them|there|same|that one|this one)\b/i.test(message);

  return {
    topicMentions,
    negativeTopics,
    referential,
    contact: INTENT_PATTERNS.contact.test(message),
    issue: INTENT_PATTERNS.issue.test(message),
    dates: INTENT_PATTERNS.dates.test(message),
    documents: INTENT_PATTERNS.documents.test(message),
    process: INTENT_PATTERNS.process.test(message),
    location: INTENT_PATTERNS.location.test(message),
    timing: INTENT_PATTERNS.timing.test(message),
    dominantTopic: conversationContext.dominantTopic,
  };
}

function tokenOverlapScore(queryTokens, textTokens) {
  if (!queryTokens.length || !textTokens.length) {
    return 0;
  }

  const textTokenSet = new Set(textTokens);
  return queryTokens.reduce((score, token) => score + (textTokenSet.has(token) ? 1 : 0), 0);
}

function buildWeightedQuery(message, conversationContext, analysis) {
  const primaryTokens = uniqueTokens(message);
  const previousTokens = analysis.referential ? uniqueTokens(conversationContext.previousUserMessage) : [];
  const assistantTokens = analysis.referential ? uniqueTokens(conversationContext.previousAssistantMessage) : [];

  const weightedTokens = new Map();
  for (const token of primaryTokens) {
    weightedTokens.set(token, (weightedTokens.get(token) || 0) + 1.5);
  }
  for (const token of previousTokens) {
    weightedTokens.set(token, (weightedTokens.get(token) || 0) + 0.9);
  }
  for (const token of assistantTokens) {
    weightedTokens.set(token, (weightedTokens.get(token) || 0) + 0.4);
  }

  return weightedTokens;
}

function scoreEntry(entry, weightedQuery, analysis, conversationContext) {
  const entryTokens = uniqueTokens(entry.searchText);
  let score = 0;

  for (const [token, weight] of weightedQuery.entries()) {
    if (entryTokens.includes(token)) {
      score += weight;
    }
  }

  const questionOverlap = tokenOverlapScore([...weightedQuery.keys()], uniqueTokens(entry.question));
  score += questionOverlap * 1.4;

  if (analysis.topicMentions.includes(entry.topic)) {
    score += 2.5;
  }

  if (!analysis.topicMentions.length && analysis.dominantTopic && analysis.dominantTopic === entry.topic) {
    score += 3;
  }

  if (analysis.contact && /(contact|email|phone|helpline|hod|coordinator|incharge|in-charge|responsible)/i.test(entry.searchText)) {
    score += 3.2;
  }

  if (analysis.contact && entry.topic === "contacts") {
    score += 2.4;
  }

  if (analysis.issue && /(issue|problem|error|portal|payment|pending|submission|support)/i.test(entry.searchText)) {
    score += 3;
  }

  if (analysis.issue && entry.topic === "contacts") {
    score += 2;
  }

  if (analysis.dates && /(date|june|july|august|timeline|start|close|merit|schedule)/i.test(entry.searchText)) {
    score += 3;
  }

  if (analysis.documents && /(document|certificate|marksheet|upload|required)/i.test(entry.searchText)) {
    score += 3;
  }

  if (analysis.process && /(process|procedure|register|apply|application|verification)/i.test(entry.searchText)) {
    score += 2.6;
  }

  if (analysis.location && /(location|located|address|campus|building|road)/i.test(entry.searchText)) {
    score += 2.6;
  }

  if (analysis.timing && /(timing|hours|monday|saturday|am|pm|lunch)/i.test(entry.searchText)) {
    score += 2.6;
  }

  if (analysis.negativeTopics.has(entry.topic)) {
    score -= 6;
  }

  if (entry.type === "faq") {
    score += 0.6;
  }

  if (conversationContext.previousUserMessage && entry.searchText.includes(conversationContext.previousUserMessage)) {
    score += 0.5;
  }

  return score;
}

function retrieveRelevantEntries(message, conversationContext, knowledgeBase) {
  const analysis = analyzeIntent(message, conversationContext);
  const weightedQuery = buildWeightedQuery(message, conversationContext, analysis);
  const entries = buildKnowledgeEntries(knowledgeBase);
  const scoredEntries = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, weightedQuery, analysis, conversationContext) }))
    .sort((left, right) => right.score - left.score);

  const topEntries = scoredEntries.filter((item) => item.score > 0).slice(0, RETRIEVAL_LIMIT);
  const topTopics = [...new Set(topEntries.map((item) => item.entry.topic))];

  return {
    analysis,
    scoredEntries,
    topEntries,
    topTopics,
    topScore: topEntries[0]?.score || 0,
    secondScore: topEntries[1]?.score || 0,
  };
}

function shouldAskClarifyingQuestion(message, retrieval) {
  const normalized = normalizeText(message);
  const genericHelp = /^(help|i need help|need help|can you help|please help|admission|fees|exam|scholarship|contact)$/i.test(message.trim());
  const broadTopicOnly = retrieval.analysis.topicMentions.length === 1
    && !retrieval.analysis.contact
    && !retrieval.analysis.issue
    && !retrieval.analysis.dates
    && !retrieval.analysis.documents
    && !retrieval.analysis.process
    && !retrieval.analysis.location
    && !retrieval.analysis.timing;

  const conflictingSignals = retrieval.topScore > 0 && retrieval.secondScore > 0 && Math.abs(retrieval.topScore - retrieval.secondScore) < 1;
  const weakMatch = retrieval.topScore < 3;
  const hasSpecificIntent = retrieval.analysis.contact
    || retrieval.analysis.issue
    || retrieval.analysis.dates
    || retrieval.analysis.documents
    || retrieval.analysis.process
    || retrieval.analysis.location
    || retrieval.analysis.timing;

  if (retrieval.analysis.negativeTopics.size > 0 && normalized.length < 40) {
    return true;
  }

  if (hasSpecificIntent) {
    return conflictingSignals && weakMatch;
  }

  return genericHelp || broadTopicOnly || conflictingSignals || weakMatch;
}

function buildClarifyingQuestion(retrieval) {
  if (!retrieval.analysis.topicMentions.length && !retrieval.analysis.dominantTopic) {
    return "I can help with admissions, fees, exams, scholarships, curriculum, rules, or department contacts. What do you need help with?";
  }

  const topic = retrieval.analysis.topicMentions[0] || retrieval.topTopics[0] || retrieval.analysis.dominantTopic || "this";
  const options = INTENT_OPTIONS[topic];

  if (retrieval.analysis.negativeTopics.size > 0) {
    const excluded = [...retrieval.analysis.negativeTopics][0];
    return `Understood. I will avoid ${excluded}-related details. What would you like help with instead?`;
  }

  if (options) {
    return `I can help with ${topic}. Do you need ${options.join(", ")}?`;
  }

  return "I want to make sure I answer correctly. Could you clarify exactly what information you need?";
}

function formatKnowledgeSnippets(topEntries) {
  return topEntries.map(({ entry }, index) => {
    const question = entry.type === "faq" ? `Question: ${entry.question}` : `Topic: ${entry.question}`;
    return `${index + 1}. [${entry.topic}] ${question}\nEnglish: ${entry.answerEnglish}${entry.answerHindi ? `\nHindi: ${entry.answerHindi}` : ""}`;
  }).join("\n\n");
}

async function generateGeminiReply(message, history, retrieval) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES).map((item) => `${item.role}: ${item.content}`).join("\n");
  const retrievedFacts = formatKnowledgeSnippets(retrieval.topEntries);

  const prompt = `
You are an intelligent college helpdesk assistant.

Your job:
- Understand the user's actual intent from the full message and conversation history.
- Do not rely on a single keyword.
- Use only the retrieved knowledge snippets below as factual ground truth.
- If the user is ambiguous, ask a clarifying question instead of assuming.
- If the answer is not available in the snippets, clearly say the information is unavailable.
- If the user says they do not want information about something, respect that.
- Answer naturally and conversationally.
- Prefer the user's language and style. If the user writes in Hindi, respond in Hindi. If the user writes in English, respond in English. If mixed, a bilingual reply is acceptable.

Intent signals:
${JSON.stringify({
    topicMentions: retrieval.analysis.topicMentions,
    contact: retrieval.analysis.contact,
    issue: retrieval.analysis.issue,
    dates: retrieval.analysis.dates,
    documents: retrieval.analysis.documents,
    process: retrieval.analysis.process,
    location: retrieval.analysis.location,
    timing: retrieval.analysis.timing,
    negativeTopics: [...retrieval.analysis.negativeTopics],
    dominantTopic: retrieval.analysis.dominantTopic,
  }, null, 2)}

Conversation history:
${recentHistory || "No prior conversation."}

Retrieved knowledge:
${retrievedFacts || "No relevant knowledge retrieved."}

Current user message:
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
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

function findEntryByIntent(retrieval) {
  const candidates = retrieval.scoredEntries.filter(({ score }) => score > 0);
  const preferred = candidates.find(({ entry }) => {
    if (retrieval.analysis.contact) {
      return /(contact|email|phone|helpline|hod|coordinator|incharge|in-charge|responsible)/i.test(entry.searchText);
    }
    if (retrieval.analysis.issue) {
      return /(issue|problem|error|portal|payment|pending|submission|support)/i.test(entry.searchText);
    }
    if (retrieval.analysis.dates) {
      return /(date|dates|january|february|march|april|may|june|july|august|september|october|november|december|timeline|start|open|close|closing|deadline|\b202[0-9]\b)/i.test(entry.searchText);
    }
    if (retrieval.analysis.documents) {
      return /(document|certificate|marksheet|upload|required)/i.test(entry.searchText);
    }
    if (retrieval.analysis.location) {
      return /(location|located|address|building|campus|road)/i.test(entry.searchText);
    }
    if (retrieval.analysis.timing) {
      return /(timing|hours|monday|saturday|am|pm|lunch)/i.test(entry.searchText);
    }
    return false;
  });

  return preferred || retrieval.topEntries[0];
}

function buildFallbackReply(message, retrieval) {
  if (retrieval.analysis.negativeTopics.size > 0 && retrieval.topScore < 3) {
    return `Understood. I will avoid ${[...retrieval.analysis.negativeTopics][0]} details. Tell me what you would like help with instead, and I will focus on that.`;
  }

  const match = findEntryByIntent(retrieval);
  if (!match) {
    if (isCollegeRelated(message)) {
      return "I could not find reliable information for that in the current knowledge base. If you want, I can help you rephrase the question or guide you to the relevant office or helpline.";
    }

    return "I can help only with college-related questions such as admissions, fees, exams, results, scholarships, rules, curriculum, and department contacts.";
  }

  const { entry } = match;
  const requestedAdmissionOwner = retrieval.analysis.contact
    && retrieval.analysis.topicMentions.includes("admission")
    && /\b(incharge|in-charge|officer|responsible)\b/i.test(message);

  if (requestedAdmissionOwner) {
    return `I could not find the name of a specific admission in-charge in the current knowledge base. The available admission support contact I found is: ${entry.answerEnglish}`;
  }

  const introduction = retrieval.analysis.contact
    ? "It sounds like you need the right contact for this."
    : retrieval.analysis.issue
      ? "It sounds like you are facing a specific issue."
      : retrieval.analysis.dates
        ? "Here is the relevant timing or date information."
        : retrieval.analysis.documents
          ? "Here are the relevant document details."
          : retrieval.analysis.location
            ? "Here is the location information I found."
            : retrieval.analysis.timing
              ? "Here are the working hours I found."
              : "Here is the most relevant information I found.";

  const knowledgeAnswer = entry.answerEnglish;
  const availabilityNote = entry.type === "default"
    ? ""
    : " If you need, I can also help with the next step or a related detail.";

  return `${introduction} ${knowledgeAnswer}${availabilityNote}`.trim();
}

export async function generateHelpdeskReply(message, history) {
  const knowledgeBase = await getKnowledgeBase();
  const conversationContext = buildConversationContext(history);
  const retrieval = retrieveRelevantEntries(message, conversationContext, knowledgeBase);

  if (!isCollegeRelated(message) && !conversationContext.dominantTopic && retrieval.topScore < 2) {
    return "I can help only with college-related questions such as admissions, fees, exams, results, scholarships, rules, curriculum, and department contacts.";
  }

  if (shouldAskClarifyingQuestion(message, retrieval)) {
    return buildClarifyingQuestion(retrieval);
  }

  try {
    const geminiReply = await generateGeminiReply(message, history, retrieval);
    if (geminiReply) {
      return geminiReply;
    }
  } catch (error) {
    console.warn("Falling back to local reply:", error.message);
  }

  return buildFallbackReply(message, retrieval);
}
