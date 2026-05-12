require('dotenv').config();

const express = require('express');
const cors = require('cors');
const {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} = require('@google/generative-ai');

const PORT = Number(process.env.PORT) || 3001;
const GEMINI_MODEL = 'gemini-2.0-flash';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function toTrimmedString(value, fieldName) {
  if (value === undefined || value === null) {
    const err = new Error(`Missing required field: ${fieldName}`);
    err.statusCode = 400;
    throw err;
  }
  if (typeof value !== 'string') {
    const err = new Error(`Field "${fieldName}" must be a string`);
    err.statusCode = 400;
    throw err;
  }
  const s = value.trim();
  if (!s) {
    const err = new Error(`Field "${fieldName}" cannot be empty`);
    err.statusCode = 400;
    throw err;
  }
  return s;
}

function toBudgetField(value) {
  if (value === undefined || value === null) {
    const err = new Error('Missing required field: budget');
    err.statusCode = 400;
    throw err;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) {
      const err = new Error('Field "budget" cannot be empty');
      err.statusCode = 400;
      throw err;
    }
    return s;
  }
  const err = new Error('Field "budget" must be a string or number');
  err.statusCode = 400;
  throw err;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeReview(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const overallScore = raw.overallScore;
  const summary = raw.summary;
  let scoreNum =
    typeof overallScore === 'number' && Number.isFinite(overallScore)
      ? overallScore
      : typeof overallScore === 'string' && overallScore.trim() !== ''
        ? Number(overallScore)
        : NaN;
  if (!Number.isFinite(scoreNum)) {
    scoreNum = 0;
  }
  scoreNum = Math.min(100, Math.max(0, scoreNum));

  const summaryStr =
    typeof summary === 'string' && summary.trim() ? summary.trim() : '';

  return {
    summary: summaryStr,
    overallScore: scoreNum,
    grammarIssues: normalizeStringArray(raw.grammarIssues),
    missingSections: normalizeStringArray(raw.missingSections),
    scientificConcerns: normalizeStringArray(raw.scientificConcerns),
    budgetSuggestions: normalizeStringArray(raw.budgetSuggestions),
  };
}

function parseJsonContent(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return null;
  }
  const trimmed = text.trim();
  const jsonSlice =
    trimmed.startsWith('```') ?
      trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/u, '')
        .trim()
    : trimmed;
  try {
    return JSON.parse(jsonSlice);
  } catch {
    return null;
  }
}

function mapGeminiError(err) {
  if (err instanceof GoogleGenerativeAIFetchError && typeof err.status === 'number') {
    if (err.status === 429) {
      const out = new Error('Gemini rate limit exceeded. Try again later.');
      out.statusCode = 429;
      return out;
    }
    if (err.status >= 500) {
      const out = new Error('Gemini service error. Try again later.');
      out.statusCode = 502;
      return out;
    }
    const msg = err.message || '';
    if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED|403/u.test(msg)) {
      const out = new Error('Gemini request was rejected (check GEMINI_API_KEY).');
      out.statusCode = 502;
      return out;
    }
    const out = new Error('Gemini request failed. Try again later.');
    out.statusCode = 502;
    return out;
  }

  const message = err && typeof err.message === 'string' ? err.message : '';
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    const out = new Error('Gemini rate limit exceeded. Try again later.');
    out.statusCode = 429;
    return out;
  }

  const out = new Error(message || 'Gemini request failed');
  out.statusCode = 502;
  return out;
}

app.post('/api/review-proposal', async (req, res, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      const err = new Error('Server is not configured: GEMINI_API_KEY is missing');
      err.statusCode = 503;
      throw err;
    }

    const { title, abstract, methodology, budget } = req.body || {};

    const titleStr = toTrimmedString(title, 'title');
    const abstractStr = toTrimmedString(abstract, 'abstract');
    const methodologyStr = toTrimmedString(methodology, 'methodology');
    const budgetStr = toBudgetField(budget);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const proposalJson = JSON.stringify({
      title: titleStr,
      abstract: abstractStr,
      methodology: methodologyStr,
      budget: budgetStr,
    });

    const prompt = `You are an academic research reviewer (grant or thesis committee style). Critically but constructively review the proposal below.

Output ONLY valid JSON with exactly these keys (no markdown, no code fences, no extra keys):
{
  "summary": "",
  "overallScore": 0,
  "grammarIssues": [],
  "missingSections": [],
  "scientificConcerns": [],
  "budgetSuggestions": []
}

Field rules:
- summary: 2–5 sentences, professional academic tone.
- overallScore: number from 0 to 100 for overall quality and fundability.
- grammarIssues: short, concrete wording issues if any; else [].
- missingSections: standard proposal sections that are absent or too thin; else [].
- scientificConcerns: rigor, methods, hypotheses, feasibility, ethics, evidence; else [].
- budgetSuggestions: scope–budget fit, realism, missing or misallocated items; else [].

Proposal (JSON):
${proposalJson}`;

    let text;
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      text = response.text();
    } catch (geminiErr) {
      throw mapGeminiError(geminiErr);
    }

    const parsed = parseJsonContent(text);
    const review = normalizeReview(parsed);

    if (!review || !review.summary) {
      const err = new Error('Model returned invalid or incomplete JSON');
      err.statusCode = 502;
      throw err;
    }

    res.status(200).json(review);
  } catch (err) {
    next(err);
  }
});

const MAX_CHAT_FIELD = 8000;
const MAX_CHAT_MSGS = 36;

function truncateField(value, maxLen) {
  if (typeof value !== 'string') return '';
  const s = value.trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}\n…[truncated]`;
}

function normalizeChatMessages(raw) {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0 || raw.length > MAX_CHAT_MSGS) return null;
  const out = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null;
    const role = m.role === 'model' || m.role === 'assistant' ? 'model' : m.role === 'user' ? 'user' : null;
    if (!role) return null;
    const content = typeof m.content === 'string' ? m.content.trim() : '';
    if (!content) return null;
    out.push({
      role,
      content: truncateField(content, MAX_CHAT_FIELD),
    });
  }
  if (out.length === 0) return null;
  const last = out[out.length - 1];
  if (last.role !== 'user') return null;
  return out;
}

function proposalContextFromBody(proposal) {
  const p = proposal && typeof proposal === 'object' ? proposal : {};
  return {
    title: truncateField(String(p.title ?? ''), 2000),
    abstract: truncateField(String(p.abstract ?? ''), MAX_CHAT_FIELD),
    methodology: truncateField(String(p.methodology ?? ''), MAX_CHAT_FIELD),
    budget: truncateField(String(p.budget ?? ''), 4000),
  };
}

app.post('/api/research-assistant-chat', async (req, res, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      const err = new Error('Server is not configured: GEMINI_API_KEY is missing');
      err.statusCode = 503;
      throw err;
    }

    const messages = normalizeChatMessages(req.body?.messages);
    if (!messages) {
      const err = new Error(
        'Invalid messages: non-empty array ending with a user message, max ' + MAX_CHAT_MSGS + ' turns'
      );
      err.statusCode = 400;
      throw err;
    }

    const ctx = proposalContextFromBody(req.body?.proposal);
    const proposalBlock = [
      ctx.title && `Title / כותרת:\n${ctx.title}`,
      ctx.abstract && `Abstract / תקציר:\n${ctx.abstract}`,
      ctx.methodology && `Research description & methods / תיאור ומתודולוגיה:\n${ctx.methodology}`,
      ctx.budget && `Budget / תקציב:\n${ctx.budget}`,
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    const systemInstruction = `You are an expert academic research-grant advisor and reviewer.
The user is drafting a proposal submission. Answer their questions clearly and practically.
Prefer Hebrew unless the user writes only in English.
Stay grounded in the draft context below; if a section is empty, say what is missing instead of inventing content.
Do not fabricate institutions, amounts, or citations. Keep answers concise (roughly 2–8 short paragraphs max unless the user asks for detail).
If asked for a full structured review, summarize strengths, gaps, budget fit, and wording — you do not need JSON here.

Current draft context (may be partial):
${proposalBlock || '(No draft text was sent yet — ask the user to fill the form or paste details.)'}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2048,
      },
    });

    const prior = messages.slice(0, -1);
    const lastUser = messages[messages.length - 1].content;

    const history = prior.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    let replyText;
    try {
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastUser);
      replyText = result.response.text();
    } catch (geminiErr) {
      throw mapGeminiError(geminiErr);
    }

    if (typeof replyText !== 'string' || !replyText.trim()) {
      const err = new Error('Model returned an empty reply');
      err.statusCode = 502;
      throw err;
    }

    res.status(200).json({ reply: replyText.trim() });
  } catch (err) {
    next(err);
  }
});

app.get('/', (req, res) => {
  res.status(200).json({ ok: true, service: 'review-proposal-api' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, _next) => {
  const status =
    err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;

  const isClient = status >= 400 && status < 500;
  const isConfig = status === 503;

  if (status >= 500) {
    console.error(err);
  }

  const body = {
    error: err.message || 'Internal server error',
  };

  if (!isClient && !isConfig && process.env.NODE_ENV !== 'production') {
    body.details = err.stack;
  }

  res.status(status).json(body);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
