/**
 * Client for the Express AI server (client/server/).
 * Development: CRA proxy (src/setupProxy.js) → same-origin /api/...
 * Production: set REACT_APP_REVIEW_API_BASE to the API origin (no trailing slash).
 */

const REVIEW_PATH = '/api/review-proposal';
const CHAT_PATH = '/api/research-assistant-chat';
const HEALTH_PATH = '/api/health';
const POLISH_PATH = '/api/polish-text';
const BIBLIOGRAPHY_VERIFY_PATH = '/api/verify-bibliography';

function apiBase() {
  return (process.env.REACT_APP_REVIEW_API_BASE || '').trim().replace(/\/$/, '');
}

export function getReviewProposalUrl() {
  const base = apiBase();
  return base ? `${base}${REVIEW_PATH}` : REVIEW_PATH;
}

export function getResearchAssistantChatUrl() {
  const base = apiBase();
  return base ? `${base}${CHAT_PATH}` : CHAT_PATH;
}

export function getReviewApiHealthUrl() {
  const base = apiBase();
  return base ? `${base}${HEALTH_PATH}` : HEALTH_PATH;
}

/** Quick reachability check — returns true if the Express AI server is up. */
export async function checkReviewApiHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(getReviewApiHealthUrl(), { signal: controller.signal });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function currencyLabel(code) {
  const map = { ILS: '₪ (ILS)', USD: '$ (USD)', EUR: '€ (EUR)' };
  return map[code] || code || '';
}

/** Maps NewResearch form state to the backend contract. */
export function buildResearchReviewPayload(formData) {
  const methodologyBlocks = [];

  if (formData.researchObjectives?.trim())
    methodologyBlocks.push(`מטרות מחקר / Research objectives:\n${formData.researchObjectives.trim()}`);
  if (formData.detailedDescription?.trim())
    methodologyBlocks.push(`תיאור מפורט של המחקר / Detailed description:\n${formData.detailedDescription.trim()}`);
  if (formData.scientificBackground?.trim())
    methodologyBlocks.push(`רקע מדעי / Scientific background:\n${formData.scientificBackground.trim()}`);
  if (formData.significanceInnovation?.trim())
    methodologyBlocks.push(`משמעות וחדשנות / Significance and innovation:\n${formData.significanceInnovation.trim()}`);
  if (formData.applicability?.trim())
    methodologyBlocks.push(`יישומיות / Applicability:\n${formData.applicability.trim()}`);

  const tasks = Array.isArray(formData.workPlanTasks) ? formData.workPlanTasks : [];
  if (tasks.length > 0) {
    const lines = tasks.map((task, i) => {
      const title = task?.title || task?.taskTitle || task?.name || task?.taskName || task?.label || '';
      const sm = task?.startMonth ?? task?.start_month ?? '';
      const em = task?.endMonth ?? task?.end_month ?? '';
      return `${i + 1}. ${title} (${sm}–${em})`;
    });
    methodologyBlocks.push(`תוכנית עבודה (Gantt) / Work plan:\n${lines.join('\n')}`);
  }

  const methodology = methodologyBlocks.join('\n\n').trim();

  const budgetLines = [];
  const total = formData.totalBudget?.toString().trim();
  if (total) budgetLines.push(`סה״כ / Total: ${total} ${currencyLabel(formData.currency)}`);
  const components = formData.budgetComponents || {};
  Object.entries(components).forEach(([key, val]) => {
    const n = parseFloat(val);
    if (val !== '' && val != null && Number.isFinite(n) && n > 0) budgetLines.push(`${key}: ${n}`);
  });
  const budget = budgetLines.join('\n').trim() || total || '';

  return {
    title: (formData.projectTitle || '').trim(),
    abstract: (formData.abstract || '').trim(),
    methodology,
    budget,
  };
}

/** Returns validation issues for missing required fields. */
export function getResearchReviewValidationIssues(formData) {
  const payload = buildResearchReviewPayload(formData);
  const issues = [];
  if (!payload.title) issues.push({ key: 'title' });
  if (!payload.abstract) issues.push({ key: 'abstract' });
  if (!payload.methodology) issues.push({ key: 'methodology' });
  if (!payload.budget) issues.push({ key: 'budget' });
  return issues;
}

const SERVER_DOWN_MSG =
  'שרת ה-AI לא רץ. בטרמינל: cd client → npm run start:server (ודאו שיש GEMINI_API_KEY ב-server/.env). או הריצו: npm run dev.';

function apiErrorFromResponse(res, data) {
  if (data?.code === 'UPSTREAM_UNAVAILABLE') {
    const err = new Error(typeof data.error === 'string' && data.error.trim() ? data.error.trim() : SERVER_DOWN_MSG);
    err.status = 503;
    err.code = 'UPSTREAM_UNAVAILABLE';
    return err;
  }

  if (res.status === 404) {
    const err = new Error(
      'נתיב הבדיקה לא נמצא בשרת. עצרו את npm run dev (Ctrl+C) והפעילו שוב — השרת צריך לעלות מחדש אחרי עדכון הקוד.'
    );
    err.status = 404;
    return err;
  }

  if (typeof data.error === 'string' && data.error.trim()) {
    const err = new Error(data.error.trim());
    err.status = res.status;
    err.details = data.details;
    err.code = data.code;
    return err;
  }

  if (res.status === 504) {
    const err = new Error('תם הזמן לתשובה מ-Gemini (504). ודאו ש-npm run start:server רץ, ונסו בקשה קצרה יותר.');
    err.status = 504;
    return err;
  }

  if (res.status === 502 || res.status === 503) {
    const err = new Error(SERVER_DOWN_MSG);
    err.status = res.status;
    return err;
  }

  const err = new Error(`שגיאת שרת (${res.status})`);
  err.status = res.status;
  err.details = data.details;
  return err;
}

export async function requestResearchProposalReview(payload) {
  const res = await fetch(getReviewProposalUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data = {};
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) throw apiErrorFromResponse(res, data);
  return data;
}

/**
 * action: 'improve' | 'translate' | 'fix'
 * fields: { fieldName: textContent, ... }
 * Returns: { improved: { fieldName: improvedText, ... } }
 */
export async function requestPolishText({ action, fields }) {
  const base = apiBase();
  const url = base ? `${base}${POLISH_PATH}` : POLISH_PATH;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, fields }),
  });
  let data = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw apiErrorFromResponse(res, data);
  return data;
}

export async function requestResearchAssistantChat(body) {
  const res = await fetch(getResearchAssistantChatUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let data = {};
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) throw apiErrorFromResponse(res, data);
  return data;
}

export function getBibliographyVerificationUrl() {
  const base = apiBase();
  return base ? `${base}${BIBLIOGRAPHY_VERIFY_PATH}` : BIBLIOGRAPHY_VERIFY_PATH;
}

/** Maps publications + research support fields to the backend verification contract. */
export function buildBibliographyVerificationPayload(formData) {
  const f = formData && typeof formData === 'object' ? formData : {};
  return {
    bibliography: {
      selectedPublications: (f.bibliographySelectedPublications || '').trim(),
      researchSupport: (f.bibliographyResearchSupport || '').trim(),
    },
  };
}

export function hasBibliographyVerificationContent(formData) {
  const b = buildBibliographyVerificationPayload(formData).bibliography;
  return Boolean(b.selectedPublications || b.researchSupport);
}

export async function requestBibliographyVerification(formData) {
  const res = await fetch(getBibliographyVerificationUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBibliographyVerificationPayload(formData)),
  });

  let data = {};
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) throw apiErrorFromResponse(res, data);
  return data;
}
