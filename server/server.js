const path = require('path');

// Load .env from this folder, overriding any stale OS environment variables.
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

const express = require('express');
const cors = require('cors');
const {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} = require('@google/generative-ai');

const PORT = Number(process.env.PORT) || 3001;
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS) || 120000;
const GEMINI_REQUEST_OPTIONS = { timeout: GEMINI_TIMEOUT_MS };

// Disable thinking to keep responses fast on flash models.
const THINKING_OFF = { thinkingConfig: { thinkingBudget: 0 } };

/** Retry once after `delayMs` on transient errors (5xx / timeout). */
async function withRetry(fn, { retries = 2, baseDelayMs = 2000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status ?? err?.statusCode;
      const isTransient =
        (typeof status === 'number' && status >= 500) ||
        err?.name === 'AbortError' ||
        /timeout|timed out|ETIMEDOUT/i.test(err?.message || '');
      if (!isTransient || attempt === retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt); // 2s, 4s
      console.warn(`[retry] attempt ${attempt + 1} failed (${status ?? err?.name}), retrying in ${delay}ms…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

const INVALID_PLACEHOLDERS = new Set(['', 'your_api_key_here', 'test', 'undefined', 'null']);

function resolveGeminiApiKey() {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (INVALID_PLACEHOLDERS.has(key) || key.length < 10) return null;
  return key;
}

const GEMINI_API_KEY = resolveGeminiApiKey();

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
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
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
  return value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function normalizeReview(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const overallScore = raw.overallScore;
  let scoreNum =
    typeof overallScore === 'number' && Number.isFinite(overallScore)
      ? overallScore
      : typeof overallScore === 'string' && overallScore.trim() !== ''
        ? Number(overallScore)
        : NaN;
  if (!Number.isFinite(scoreNum)) scoreNum = 0;
  scoreNum = Math.min(100, Math.max(0, scoreNum));
  const summaryStr = typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : '';
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
  if (typeof text !== 'string' || !text.trim()) return null;
  const trimmed = text.trim();
  const jsonSlice = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/u, '').trim()
    : trimmed;
  try {
    return JSON.parse(jsonSlice);
  } catch {
    return null;
  }
}

function mapGeminiError(err) {
  // Raw log so we can see exactly what Gemini returned
  console.error('[Gemini raw error]', {
    name: err?.name,
    status: err?.status,
    statusCode: err?.statusCode,
    message: err?.message,
    errorDetails: err?.errorDetails,
    stack: err?.stack?.split('\n')[0],
  });

  const message = err && typeof err.message === 'string' ? err.message : '';
  const suggestedModel =
    GEMINI_MODEL === 'gemini-1.5-flash' ? 'gemini-2.0-flash' : 'gemini-1.5-flash';
  const status =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.statusCode === 'number'
        ? err.statusCode
        : null;

  if (err?.name === 'AbortError' || /timeout|timed out|aborted|ETIMEDOUT/i.test(message)) {
    const out = new Error('תם הזמן לתשובה מ-Gemini. נסו שוב עם בקשה קצרה יותר.');
    out.statusCode = 504;
    return out;
  }

  if ((err instanceof GoogleGenerativeAIFetchError && typeof err.status === 'number') || status) {
    const httpStatus = typeof err?.status === 'number' ? err.status : status;
    if (httpStatus === 429) {
      const isCredits = /prepayment|credits/i.test(message);
      const out = new Error(
        isCredits
          ? 'נראה שהקרדיטים/המכסה בחשבון Gemini אזלו. בדקו Usage/Billing ב-Google AI Studio ונסו שוב.'
          : 'מכסת הבקשות ל-Gemini מוצתה. נסו שוב עוד כ-60 שניות.'
      );
      out.statusCode = 429;
      return out;
    }
    if (httpStatus >= 500) {
      const out = new Error('שגיאת שרת ב-Gemini. נסו שוב עוד רגע.');
      out.statusCode = 502;
      return out;
    }
    if (httpStatus === 404 || /model.*not found|not supported|unknown model/i.test(message)) {
      const out = new Error(
        `המודל שהוגדר (${GEMINI_MODEL}) לא זמין עבור המפתח/האזור הזה. נסו לשנות ב-server/.env ל- GEMINI_MODEL=${suggestedModel} ולהפעיל מחדש שרת.`
      );
      out.statusCode = 502;
      return out;
    }
    if (
      httpStatus === 400 || httpStatus === 401 || httpStatus === 403 ||
      /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|does not have permission/i.test(message)
    ) {
      const out = new Error(
        'מפתח GEMINI_API_KEY לא תקין או שאין הרשאה למודל. צרו/עדכנו מפתח ב-https://aistudio.google.com/apikey ושמרו ב-server/.env ללא רווחים או מרכאות.'
      );
      out.statusCode = 502;
      return out;
    }
    const out = new Error('בקשה ל-Gemini נכשלה. נסו שוב.');
    out.statusCode = 502;
    return out;
  }

  if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    const out = new Error('מכסת הבקשות ל-Gemini מוצתה. נסו שוב עוד כ-60 שניות.');
    out.statusCode = 429;
    return out;
  }

  if (/location is not supported|unsupported country|not available in your region/i.test(message)) {
    const out = new Error('Gemini API לא זמין כרגע באזור/חשבון הזה. נסו מפתח אחר או חשבון עם אזור נתמך.');
    out.statusCode = 502;
    return out;
  }

  const out = new Error(
    message
      ? `בקשה ל-Gemini נכשלה: ${message}`
      : 'בקשה ל-Gemini נכשלה מסיבה לא ידועה (502).'
  );
  out.statusCode = 502;
  return out;
}

// ── Routes ──────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, geminiConfigured: Boolean(GEMINI_API_KEY), model: GEMINI_MODEL });
});

app.post('/api/review-proposal', async (req, res, next) => {
  try {
    if (!GEMINI_API_KEY) {
      const err = new Error('Server is not configured: GEMINI_API_KEY is missing');
      err.statusCode = 503;
      throw err;
    }

    const { title, abstract, methodology, budget } = req.body || {};
    const titleStr = toTrimmedString(title, 'title');
    const abstractStr = toTrimmedString(abstract, 'abstract');
    const methodologyStr = toTrimmedString(methodology, 'methodology');
    const budgetStr = toBudgetField(budget);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel(
      {
        model: GEMINI_MODEL,
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', ...THINKING_OFF },
      },
      GEMINI_REQUEST_OPTIONS
    );

    const proposalJson = JSON.stringify({ title: titleStr, abstract: abstractStr, methodology: methodologyStr, budget: budgetStr });

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
      const result = await withRetry(() => model.generateContent(prompt));
      text = result.response.text();
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
  return s.length <= maxLen ? s : `${s.slice(0, maxLen)}\n…[truncated]`;
}

function normalizeChatMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_CHAT_MSGS) return null;
  const out = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null;
    const role = m.role === 'model' || m.role === 'assistant' ? 'model' : m.role === 'user' ? 'user' : null;
    if (!role) return null;
    const content = typeof m.content === 'string' ? m.content.trim() : '';
    if (!content) return null;
    out.push({ role, content: truncateField(content, MAX_CHAT_FIELD) });
  }
  if (!out.length || out[out.length - 1].role !== 'user') return null;
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
    if (!GEMINI_API_KEY) {
      const err = new Error('Server is not configured: GEMINI_API_KEY is missing');
      err.statusCode = 503;
      throw err;
    }

    const messages = normalizeChatMessages(req.body?.messages);
    if (!messages) {
      const err = new Error('Invalid messages: non-empty array ending with a user message, max ' + MAX_CHAT_MSGS + ' turns');
      err.statusCode = 400;
      throw err;
    }

    const ctx = proposalContextFromBody(req.body?.proposal);
    const proposalBlock = [
      ctx.title && `Title / כותרת:\n${ctx.title}`,
      ctx.abstract && `Abstract / תקציר:\n${ctx.abstract}`,
      ctx.methodology && `Research description & methods / תיאור ומתודולוגיה:\n${ctx.methodology}`,
      ctx.budget && `Budget / תקציב:\n${ctx.budget}`,
    ].filter(Boolean).join('\n\n---\n\n');

    const systemInstruction = `You are an expert academic research-grant advisor and reviewer.
The user is drafting a proposal submission. Answer their questions clearly and practically.
Prefer Hebrew unless the user writes only in English.

The proposal has the following sections (use these exact names when referring to them):
1. Abstract / תקציר
2. Scientific background and state of the art / רקע מדעי ומצב טכנולוגי עדכני
3. Research objectives and specific aims / מטרות מחקר ומטרות ספציפיות
4. Detailed description of the proposed research / תיאור מפורט של המחקר המוצע
5. Significance, innovation and potential benefits / משמעות, חדשנות ותועלת פוטנציאלית
6. Applicability / ישימות

FORMATTING RULES (strictly follow):
- Use **bold** (double asterisks) for section titles and key terms only.
- Use - for bullet points.
- Do NOT use # or ## headers. Do NOT use --- separators. Do NOT use * for bullets (use -).
- Do NOT write the word "טיוטה" or "draft" anywhere.
- Keep answers clean and readable — avoid excessive symbols.

CONTENT RULES:
- When the user asks for a full draft or proposal, write ALL sections (Abstract, Scientific Background, Research Objectives, Detailed Description, Significance/Innovation, Applicability, Budget) with their full content — not just headings.
- When the user asks for advice or feedback only, give guidance and bullet points — without writing paragraph drafts unless asked.
- If a section is missing from the form, tell the user what to add — do not invent content.
- Do not invent grant deadlines, committee names, or citations.

Current draft context (may be partial):
${proposalBlock || '(No draft text in the form yet — use the user message as the topic if they describe one.)'}`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel(
      {
        model: GEMINI_MODEL,
        systemInstruction,
        generationConfig: { temperature: 0.35, maxOutputTokens: 4096, ...THINKING_OFF },
      },
      GEMINI_REQUEST_OPTIONS
    );

    const prior = messages.slice(0, -1);
    const lastUser = messages[messages.length - 1].content;
    const history = prior.map((m) => ({ role: m.role, parts: [{ text: m.content }] }));

    let replyText;
    try {
      const chat = model.startChat({ history });
      const result = await withRetry(() => chat.sendMessage(lastUser));
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

const MAX_POLISH_FIELD = 4000;
const VALID_POLISH_ACTIONS = new Set(['improve', 'translate', 'fix']);

app.post('/api/polish-text', async (req, res, next) => {
  try {
    if (!GEMINI_API_KEY) {
      const err = new Error('Server is not configured: GEMINI_API_KEY is missing');
      err.statusCode = 503;
      throw err;
    }

    const { action, fields } = req.body || {};

    if (!VALID_POLISH_ACTIONS.has(action)) {
      return res.status(400).json({ error: 'Invalid action. Use: improve | translate | fix' });
    }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return res.status(400).json({ error: 'fields must be a non-empty object' });
    }

    const cleanFields = {};
    for (const [key, val] of Object.entries(fields)) {
      if (typeof val === 'string' && val.trim()) {
        const s = val.trim();
        cleanFields[key] = s.length <= MAX_POLISH_FIELD ? s : s.slice(0, MAX_POLISH_FIELD) + '\n…[truncated]';
      }
    }
    if (Object.keys(cleanFields).length === 0) {
      return res.status(400).json({ error: 'No non-empty fields provided' });
    }

    const actionInstructions = {
      improve: `Improve phrasing, clarity, and flow for professional academic writing.
Also fix ALL errors: spelling, grammar, punctuation, AND wrong words in context (valid dictionary words used incorrectly, e.g. Hebrew לטהר→לתאר when describing a problem, עט→את).
CRITICAL: Do NOT translate. Each output value MUST stay in the SAME language as its input value.
If a field is in Hebrew, the output for that field MUST be in Hebrew.
If a field is in English, the output for that field MUST be in English.
Do not change meaning or add new information.`,
      fix: `Proofread for ALL errors that make the text wrong or nonsensical in context — not only obvious misspellings.

Fix these error types:
1. Spelling typos and missing/extra letters.
2. Grammar and punctuation (including wrong particles: את/עט/עם, agreement, word order).
3. WRONG-WORD errors: a token may be a valid dictionary word but still be incorrect in context (homophones, one-letter typos, keyboard mistakes). Replace with the word the author almost certainly meant.
   Hebrew examples (apply the same logic in English):
   - "לטהר את הבעיה" → "לתאר את הבעיה" (describe, not purify)
   - "עט הבעיה" → "את הבעיה" (direct object marker)
   - "מנגנ" → "מנגנון" (truncated word)
   - "יעו" at end of sentence about goals → likely "יעילות" or complete the intended word from context

For each field: read the full paragraph/list and ask "Does every word make sense in a research proposal?" If not, fix the minimum word(s) needed.

Make the MINIMUM changes needed. Do NOT rephrase for style.
If a field is already correct, return it unchanged.
CRITICAL: Do NOT translate. Each output value MUST stay in the SAME language as its input value.
Do not change meaning or add new information beyond fixing errors.`,
      translate: `Translate every field to professional academic English.
Use formal, precise academic tone suitable for grant submissions.
Do not change meaning or add new information.`,
    };

    const prompt = `You are an expert academic editor and proofreader, fluent in Hebrew and English research writing.

Task: ${actionInstructions[action]}

Process:
1. Read each field in full context (research proposal / grant application).
2. Detect errors including words that are spelled correctly but wrong in meaning (wrong-word / contextual typos).
3. Apply only the corrections required by the task above.

Return ONLY a valid JSON object with exactly the same keys as the input, and the processed text as values.
Do NOT add markdown, code fences, explanation, or extra keys.

Input fields:
${JSON.stringify(cleanFields, null, 2)}`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const temperature = action === 'fix' ? 0.1 : 0.25;
    const model = genAI.getGenerativeModel(
      {
        model: GEMINI_MODEL,
        generationConfig: { temperature, responseMimeType: 'application/json', ...THINKING_OFF },
      },
      GEMINI_REQUEST_OPTIONS
    );

    let text;
    try {
      const result = await withRetry(() => model.generateContent(prompt));
      text = result.response.text();
    } catch (geminiErr) {
      throw mapGeminiError(geminiErr);
    }

    const parsed = parseJsonContent(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const err = new Error('Model returned invalid JSON');
      err.statusCode = 502;
      throw err;
    }

    res.status(200).json({ improved: parsed });
  } catch (err) {
    next(err);
  }
});

app.get('/', (req, res) => {
  res.status(200).json({ ok: true, service: 'review-proposal-api' });
});

// ---------------------------------------------------------------------------
// POST /api/generate-pdf  — render HTML to PDF via Puppeteer (headless Chrome)
// ---------------------------------------------------------------------------
app.post('/api/generate-pdf', async (req, res) => {
  const { html, filename = 'document.pdf' } = req.body || {};
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Missing html field' });
  }

  let browser;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();

    // Load the full HTML document (including <style> tags) directly.
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' },
    });

    await browser.close();
    browser = null;

    const safeFilename = encodeURIComponent(filename.replace(/[/\\]/g, '_'));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${safeFilename}`,
      'Content-Length': pdfBuffer.length,
    });
    return res.end(pdfBuffer);
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('[generate-pdf]', err);
    return res.status(500).json({ error: 'PDF generation failed', details: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, _next) => {
  const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  if (status >= 500) console.error(err);
  const body = { error: err.message || 'Internal server error' };
  if (status >= 500 && process.env.NODE_ENV !== 'production') body.details = err.stack;
  res.status(status).json(body);
});

if (!GEMINI_API_KEY) {
  const envPath = path.join(__dirname, '.env');
  console.error(`
[review-server] GEMINI_API_KEY is missing or invalid.

  1. Open https://aistudio.google.com/apikey — create a Gemini API key
  2. Create/edit: ${envPath}
  3. Add: GEMINI_API_KEY=<your_key> (no space after =, no quotes)
  4. Run: npm run start:server
`);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} (model: ${GEMINI_MODEL})`);
});
