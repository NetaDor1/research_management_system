/**
 * Client for the patent AI assistant (Express server in client/server/).
 */

export {
  checkReviewApiHealth,
} from './researchProposalReview';

const CHAT_PATH = '/api/patent-assistant-chat';

function apiBase() {
  return (process.env.REACT_APP_REVIEW_API_BASE || '').trim().replace(/\/$/, '');
}

export function getPatentAssistantChatUrl() {
  const base = apiBase();
  return base ? `${base}${CHAT_PATH}` : CHAT_PATH;
}

/** Maps NewPatent form state to the backend contract. */
export function buildPatentReviewPayload(formData) {
  const f = formData && typeof formData === 'object' ? formData : {};

  const disclosureBlocks = [];
  if (f.shortDescription?.trim()) {
    disclosureBlocks.push(
      `תיאור קצר של המצאה / Short description of the invention:\n${f.shortDescription.trim()}`
    );
  }
  if (f.inventionTypeElaboration?.trim()) {
    disclosureBlocks.push(
      `האם המצאה היא מוצר/תהליך/שיטה? פרט / Product, process or method (elaborate):\n${f.inventionTypeElaboration.trim()}`
    );
  }
  if (f.potentialCustomers?.trim()) {
    disclosureBlocks.push(
      `לקוחות/צרכנים/משתמשים פוטנציאליים / Potential customers, consumers or users:\n${f.potentialCustomers.trim()}`
    );
  }
  if (f.commercialEntityContacts?.trim()) {
    disclosureBlocks.push(
      `קשרים עם גורם מסחרי / Commercial entity contacts regarding the invention:\n${f.commercialEntityContacts.trim()}`
    );
  }

  const detailedBlocks = [];
  if (f.detailedDescription?.trim()) {
    detailedBlocks.push(
      `תיאור מפורט של המצאה / Detailed description of the invention:\n${f.detailedDescription.trim()}`
    );
  }
  if (f.advantagesOverExisting?.trim()) {
    detailedBlocks.push(
      `יתרונות על פני הידע והשימושים הקיימים / Advantages over existing knowledge and uses:\n${f.advantagesOverExisting.trim()}`
    );
  }
  if (f.potentialUsesAndImplementation?.trim()) {
    detailedBlocks.push(
      `שימושים פוטנציאליים ויישום / Potential uses and implementation:\n${f.potentialUsesAndImplementation.trim()}`
    );
  }

  return {
    title: (f.inventionTitleEnglish || f.projectTitle || '').trim(),
    disclosure: disclosureBlocks.join('\n\n').trim(),
    detailed: detailedBlocks.join('\n\n').trim(),
  };
}

export async function requestPatentAssistantChat(body) {
  const res = await fetch(getPatentAssistantChatUrl(), {
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
    const SERVER_DOWN_MSG =
      'שרת ה-AI לא רץ. בטרמינל: cd client → npm run start:server (ודאו שיש GEMINI_API_KEY ב-server/.env).';
    if (res.status === 404) {
      throw new Error(
        'נתיב עוזר הפטנט לא נמצא בשרת. עצרו את npm run dev והפעילו שוב.'
      );
    }
    if (typeof data.error === 'string' && data.error.trim()) {
      const err = new Error(data.error.trim());
      err.status = res.status;
      throw err;
    }
    if (res.status === 502 || res.status === 503) {
      throw new Error(SERVER_DOWN_MSG);
    }
    throw new Error(`שגיאת שרת (${res.status})`);
  }

  return data;
}
