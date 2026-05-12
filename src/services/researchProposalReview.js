/**
 * Client for POST /api/review-proposal (Express server under /server).
 * Development: use CRA proxy (src/setupProxy.js) → same-origin /api/...
 * Production: set REACT_APP_REVIEW_API_BASE to the API origin (no trailing slash).
 */

const REVIEW_PATH = '/api/review-proposal';
const CHAT_PATH = '/api/research-assistant-chat';

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

function currencyLabel(code) {
  const map = { ILS: '₪ (ILS)', USD: '$ (USD)', EUR: '€ (EUR)' };
  return map[code] || code || '';
}

/**
 * Maps NewResearch form state to the backend contract.
 */
export function buildResearchReviewPayload(formData) {
  const methodologyBlocks = [];

  if (formData.researchObjectives?.trim()) {
    methodologyBlocks.push(
      `מטרות מחקר / Research objectives:\n${formData.researchObjectives.trim()}`
    );
  }
  if (formData.detailedDescription?.trim()) {
    methodologyBlocks.push(
      `תיאור מפורט של המחקר / Detailed description:\n${formData.detailedDescription.trim()}`
    );
  }
  if (formData.scientificBackground?.trim()) {
    methodologyBlocks.push(
      `רקע מדעי / Scientific background:\n${formData.scientificBackground.trim()}`
    );
  }
  if (formData.significanceInnovation?.trim()) {
    methodologyBlocks.push(
      `משמעות וחדשנות / Significance and innovation:\n${formData.significanceInnovation.trim()}`
    );
  }
  if (formData.applicability?.trim()) {
    methodologyBlocks.push(`יישומיות / Applicability:\n${formData.applicability.trim()}`);
  }

  const tasks = Array.isArray(formData.workPlanTasks) ? formData.workPlanTasks : [];
  if (tasks.length > 0) {
    const lines = tasks.map((task, i) => {
      const title =
        task?.title ||
        task?.taskTitle ||
        task?.name ||
        task?.taskName ||
        task?.label ||
        '';
      const sm = task?.startMonth ?? task?.start_month ?? '';
      const em = task?.endMonth ?? task?.end_month ?? '';
      return `${i + 1}. ${title} (${sm}–${em})`;
    });
    methodologyBlocks.push(`תוכנית עבודה (Gantt) / Work plan:\n${lines.join('\n')}`);
  }

  const methodology = methodologyBlocks.join('\n\n').trim();

  const budgetLines = [];
  const total = formData.totalBudget?.toString().trim();
  if (total) {
    budgetLines.push(`סה״כ / Total: ${total} ${currencyLabel(formData.currency)}`);
  }
  const components = formData.budgetComponents || {};
  Object.entries(components).forEach(([key, val]) => {
    const n = parseFloat(val);
    if (val !== '' && val != null && Number.isFinite(n) && n > 0) {
      budgetLines.push(`${key}: ${n}`);
    }
  });
  const budget = budgetLines.join('\n').trim() || total || '';

  return {
    title: (formData.projectTitle || '').trim(),
    abstract: (formData.abstract || '').trim(),
    methodology,
    budget,
  };
}

/**
 * Returns Hebrew messages for missing fields (keys: title, abstract, methodology, budget).
 */
export function getResearchReviewValidationIssues(formData) {
  const payload = buildResearchReviewPayload(formData);
  const issues = [];
  if (!payload.title) issues.push({ key: 'title' });
  if (!payload.abstract) issues.push({ key: 'abstract' });
  if (!payload.methodology) issues.push({ key: 'methodology' });
  if (!payload.budget) issues.push({ key: 'budget' });
  return issues;
}

export async function requestResearchProposalReview(payload) {
  const res = await fetch(getReviewProposalUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg =
      typeof data.error === 'string' && data.error.trim() ?
        data.error.trim()
      : `שגיאת שרת (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }

  return data;
}

/**
 * @param {{ messages: { role: 'user' | 'model'; content: string }[]; proposal: Record<string, string> }} body
 */
export async function requestResearchAssistantChat(body) {
  const res = await fetch(getResearchAssistantChatUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg =
      typeof data.error === 'string' && data.error.trim() ?
        data.error.trim()
      : `שגיאת שרת (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }

  return data;
}
