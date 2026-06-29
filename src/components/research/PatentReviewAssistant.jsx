import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  buildPatentReviewPayload,
  checkReviewApiHealth,
  requestPatentAssistantChat,
} from '../../services/patentProposalReview';
import './ResearchProposalReviewAssistant.css';

function renderInline(text) {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part || null
  );
}

function MarkdownMessage({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
        if (headerMatch) {
          return <div key={i} className="ai-md-header">{renderInline(headerMatch[1])}</div>;
        }
        const bulletMatch = line.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
          return <div key={i} className="ai-md-bullet">{'• '}{renderInline(bulletMatch[1])}</div>;
        }
        if (!line.trim()) {
          return <div key={i} className="ai-md-gap" />;
        }
        return <div key={i}>{renderInline(line)}</div>;
      })}
    </>
  );
}

const NUMBERED_FIELD_MAP = {
  1: 'shortDescription',
  2: 'inventionTypeElaboration',
  3: 'potentialCustomers',
  4: 'commercialEntityContacts',
  5: 'detailedDescription',
  6: 'advantagesOverExisting',
  7: 'potentialUsesAndImplementation',
};

/** More specific patterns first to avoid wrong matches. */
const SECTION_DEFS = [
  { field: 'commercialEntityContacts', pattern: /גורם מסחרי|קשרים עם גורם|commercial entity|commercial contacts/i },
  { field: 'potentialCustomers', pattern: /לקוחות|צרכנים|משתמשים|potential customers|consumers or users/i },
  { field: 'inventionTypeElaboration', pattern: /מוצר\/תהליך\/שיטה|product.*process|process or method/i },
  { field: 'shortDescription', pattern: /תיאור קצר(?!.*מפורט)|short description/i },
  { field: 'advantagesOverExisting', pattern: /יתרונות.*(?:ידע|קיימ)|advantages over/i },
  { field: 'potentialUsesAndImplementation', pattern: /שימושים פוטנציאליים|potential uses/i },
  { field: 'detailedDescription', pattern: /תיאור מפורט|detailed description/i },
];

const GROUP_HEADER_PATTERN = /^(?:טופס גילוי המצאה|invention disclosure form|תיאור מפורט של המצאה|detailed invention description)(?:\s*\(|\s*\/|\s*$)/i;

function normalizeHeaderText(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/\s*[\(（][^)）]*[\)）]\s*/g, ' ')
    .replace(/\s*\/\s*.+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveSectionField(num, text) {
  if (num && NUMBERED_FIELD_MAP[num]) {
    return NUMBERED_FIELD_MAP[num];
  }
  const normalized = normalizeHeaderText(text);
  if (!normalized || GROUP_HEADER_PATTERN.test(normalized)) return null;
  for (const { field, pattern } of SECTION_DEFS) {
    if (pattern.test(normalized)) return field;
  }
  return null;
}

function extractHeaderFromLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 5. **Title** or 5. Title
  let m = trimmed.match(/^(\d+)[\.\):]\s*(?:\*\*(.+?)\*\*|(.+?))\s*$/);
  if (m) {
    return {
      type: 'section',
      num: Number(m[1]),
      text: (m[2] || m[3] || '').trim(),
    };
  }

  // **5. Title** or **Title**
  m = trimmed.match(/^\*\*(?:(\d+)[\.\):]\s*)?(.+?)\*\*\s*$/);
  if (m) {
    const num = m[1] ? Number(m[1]) : null;
    const text = m[2].trim();
    if (!num && GROUP_HEADER_PATTERN.test(normalizeHeaderText(text))) {
      return { type: 'group' };
    }
    return { type: 'section', num, text };
  }

  // Plain numbered line without bold: 5. Title
  m = trimmed.match(/^(\d+)[\.\):]\s+(.+)$/);
  if (m) {
    return { type: 'section', num: Number(m[1]), text: m[2].trim() };
  }

  return null;
}

function isFullPatentDraft(text) {
  const parsed = parsePatentSections(text);
  return Object.keys(parsed).length >= 3;
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '- ')
    .trim();
}

function parsePatentSections(text) {
  const lines = text.split('\n');
  const result = {};
  let currentField = null;
  let buffer = [];

  const flush = () => {
    if (currentField) {
      const content = stripMarkdown(buffer.join('\n').trim());
      if (content) result[currentField] = content;
    }
    buffer = [];
  };

  for (const line of lines) {
    const header = extractHeaderFromLine(line);
    if (header?.type === 'group') {
      flush();
      currentField = null;
      continue;
    }
    if (header?.type === 'section') {
      const field = resolveSectionField(header.num, header.text);
      if (field) {
        flush();
        currentField = field;
        continue;
      }
    }
    if (currentField !== null) buffer.push(line);
  }
  flush();
  return result;
}

const PatentReviewAssistant = ({ formData, onFillForm }) => {
  const { t, language, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);
  const [error, setError] = useState('');
  const [serverOnline, setServerOnline] = useState(null);
  const [filledIndices, setFilledIndices] = useState(new Set());
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  const startResize = useCallback((e, dir) => {
    e.preventDefault();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = rect.width;
    const startH = rect.height;

    const onMove = (mv) => {
      if (dir.includes('e')) {
        const w = Math.min(Math.max(280, startW + mv.clientX - startX), window.innerWidth - 40);
        wrapper.style.width = `${w}px`;
      }
      if (dir.includes('n')) {
        const h = Math.min(Math.max(300, startH - (mv.clientY - startY)), window.innerHeight - 100);
        wrapper.style.height = `${h}px`;
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const loading = loadingAction !== null;
  const lang = language === 'en' ? 'en' : 'he';

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setServerOnline(null);
    checkReviewApiHealth().then((ok) => {
      if (cancelled) return;
      setServerOnline(ok);
      if (!ok) {
        setError(
          lang === 'en'
            ? 'AI server is not running. In a terminal: cd client → npm run start:server (or npm run dev).'
            : 'שרת ה-AI לא רץ. בטרמינל: cd client → npm run start:server (או npm run dev).'
        );
      }
    });
    return () => { cancelled = true; };
  }, [open, lang]);

  const sendUserMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput('');
    setError('');
    const userMsg = { role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoadingAction('send');

    try {
      const patent = buildPatentReviewPayload(formData);
      const { reply } = await requestPatentAssistantChat({ messages: next, patent });
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: reply, canFillForm: isFullPatentDraft(reply) },
      ]);
    } catch (e) {
      setError(e.message || (lang === 'en' ? 'Request failed' : 'הבקשה נכשלה'));
    } finally {
      setLoadingAction(null);
    }
  }, [input, loading, messages, formData, lang]);

  const handleFillForm = useCallback((msgIdx, content) => {
    const sections = parsePatentSections(content);
    const count = Object.keys(sections).length;
    if (count === 0) return;
    if (onFillForm) onFillForm(sections);
    setFilledIndices((prev) => new Set([...prev, msgIdx]));
    const note = lang === 'he'
      ? `✓ ${count} שדות הוזנו לטופס.`
      : `✓ ${count} fields filled in the form.`;
    setMessages((prev) => [...prev, { role: 'model', content: note }]);
  }, [onFillForm, lang]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage();
    }
  };

  const ui = (
    <div
      className="research-ai-chat-root"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ textAlign: isRTL ? 'right' : 'left' }}
    >
      {open ? (
        <div ref={wrapperRef} className="research-ai-chat-panel-wrapper">
          <div className="ai-resize-handle ai-resize-n" onMouseDown={(e) => startResize(e, 'n')} />
          <div className="ai-resize-handle ai-resize-e" onMouseDown={(e) => startResize(e, 'e')} />
          <div className="ai-resize-handle ai-resize-ne" onMouseDown={(e) => startResize(e, 'ne')} />

          <div
            className="research-ai-chat-panel"
            role="dialog"
            aria-label={t('aiPatentChatTitle', 'עוזר בקשת פטנט')}
            style={{ width: '100%', height: '100%' }}
          >
            <div className="research-ai-chat-header">
              <h2>{t('aiPatentChatTitle', 'עוזר בקשת פטנט')}</h2>
              <button
                type="button"
                className="research-ai-chat-icon-btn"
                onClick={() => setOpen(false)}
                aria-label={t('aiPatentChatClose', 'סגירה')}
              >
                ×
              </button>
            </div>

            {serverOnline === false ? (
              <div className="research-ai-chat-server-hint" role="status">
                {lang === 'en' ? 'AI server offline' : 'שרת AI לא מחובר'}
              </div>
            ) : null}

            <div className="research-ai-chat-messages" ref={listRef}>
              <p className="research-ai-chat-intro">
                {t(
                  'aiPatentChatIntro',
                  'שאלו על ניסוח טופס גילוי המצאה, תיאור מפורט, יתרונות תחרותיים או הכנה להגשת פטנט. ההקשר נשלח מהטופס הנוכחי.'
                )}
              </p>
              {messages.map((m, idx) => (
                <div key={`m-${idx}`} className={`research-ai-chat-bubble-row ${m.role}`}>
                  <div className={`research-ai-chat-bubble ${m.role}`}>
                    {m.role === 'model'
                      ? <MarkdownMessage text={m.content} />
                      : m.content}
                    {m.role === 'model' && m.canFillForm && onFillForm ? (
                      filledIndices.has(idx) ? (
                        <div className="ai-fill-form-done">
                          {lang === 'he' ? '✓ הוזן לטופס' : '✓ Filled in form'}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="ai-fill-form-btn"
                          onClick={() => handleFillForm(idx, m.content)}
                        >
                          {lang === 'he' ? 'הזן לטופס' : 'Fill form'}
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="research-ai-chat-typing">
                  {t('aiPatentChatThinking', 'כותב תשובה…')}
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="research-ai-chat-error" role="alert">
                {error}
              </div>
            ) : null}

            <div className="research-ai-chat-input-row">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('aiPatentChatPlaceholder', 'כתבו שאלה על המצאה…')}
                rows={2}
                disabled={loading}
                aria-label={t('aiPatentChatPlaceholder', 'כתבו שאלה על המצאה…')}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <button
                type="button"
                className="research-ai-chat-send"
                onClick={sendUserMessage}
                disabled={loading || !input.trim() || serverOnline === false}
                aria-busy={loadingAction === 'send'}
              >
                {loadingAction === 'send' ? (
                  <span className="ai-spinner" aria-label={lang === 'en' ? 'Sending…' : 'שולח…'} />
                ) : (
                  t('aiPatentChatSend', 'שליחה')
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="research-ai-chat-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('aiPatentChatFabAria', 'פתיחת עוזר בקשת פטנט')}
        title={t('aiPatentChatFabAria', 'פתיחת עוזר בקשת פטנט')}
      >
        AI
      </button>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(ui, document.body);
};

export default PatentReviewAssistant;
