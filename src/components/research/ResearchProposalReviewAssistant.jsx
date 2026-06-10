import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  buildResearchReviewPayload,
  checkReviewApiHealth,
  requestResearchAssistantChat,
} from '../../services/researchProposalReview';
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

// ── Full-proposal detection & section parsing ───────────────────────────────

const SECTION_DEFS = [
  { field: 'abstract',             pattern: /תקציר|abstract/i },
  { field: 'scientificBackground', pattern: /רקע מדעי|scientific background/i },
  { field: 'researchObjectives',   pattern: /מטרות מחקר|research objectives/i },
  { field: 'detailedDescription',  pattern: /תיאור מפורט|detailed description/i },
  { field: 'significanceInnovation', pattern: /משמעות|חדשנות|significance|innovation/i },
  { field: 'applicability',        pattern: /ישימות|applicability/i },
];

function isFullProposal(text) {
  return SECTION_DEFS.filter(({ pattern }) => pattern.test(text)).length >= 3;
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** → plain
    .replace(/\*(.+?)\*/g, '$1')       // *italic* → plain
    .replace(/^#{1,6}\s+/gm, '')       // # headers → plain
    .replace(/^[-*]\s+/gm, '- ')       // normalize bullets
    .trim();
}

function parseProposalSections(text) {
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
    // Match lines like **Title** or **1. Title**
    const bold = line.match(/^\*\*(?:\d+[\.\)]\s*)?(.+?)\*\*\s*$/);
    if (bold) {
      const headerText = bold[1].trim();
      const matched = SECTION_DEFS.find(({ pattern }) => pattern.test(headerText));
      if (matched) {
        flush();
        currentField = matched.field;
        continue;
      }
    }
    if (currentField !== null) buffer.push(line);
  }
  flush();
  return result;
}

const ResearchProposalReviewAssistant = ({ formData, onFillForm }) => {
  const { t, language, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingAction, setLoadingAction] = useState(null); // 'send' | null
  const [error, setError] = useState('');
  const [serverOnline, setServerOnline] = useState(null);
  // track which message indices have been imported into the form
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
        wrapper.style.width = w + 'px';
      }
      if (dir.includes('n')) {
        const h = Math.min(Math.max(300, startH - (mv.clientY - startY)), window.innerHeight - 100);
        wrapper.style.height = h + 'px';
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
      const proposal = buildResearchReviewPayload(formData);
      const { reply } = await requestResearchAssistantChat({ messages: next, proposal });
      setMessages((prev) => [...prev, { role: 'model', content: reply, canFillForm: isFullProposal(reply) }]);
    } catch (e) {
      setError(e.message || (lang === 'en' ? 'Request failed' : 'הבקשה נכשלה'));
    } finally {
      setLoadingAction(null);
    }
  }, [input, loading, messages, formData, lang]);

  const handleFillForm = useCallback((msgIdx, content) => {
    const sections = parseProposalSections(content);
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
        <div
          ref={wrapperRef}
          className="research-ai-chat-panel-wrapper"
        >
          {/* top resize handle — outside the clipped panel */}
          <div className="ai-resize-handle ai-resize-n" onMouseDown={(e) => startResize(e, 'n')} />
          {/* right resize handle */}
          <div className="ai-resize-handle ai-resize-e" onMouseDown={(e) => startResize(e, 'e')} />
          {/* top-right corner handle */}
          <div className="ai-resize-handle ai-resize-ne" onMouseDown={(e) => startResize(e, 'ne')} />

          <div
            className="research-ai-chat-panel"
            role="dialog"
            aria-label={t('aiResearchChatTitle', 'עוזר הצעת מחקר')}
            style={{ width: '100%', height: '100%' }}
          >

          <div className="research-ai-chat-header">
            <h2>{t('aiResearchChatTitle', 'עוזר הצעת מחקר')}</h2>
            <button
              type="button"
              className="research-ai-chat-icon-btn"
              onClick={() => setOpen(false)}
              aria-label={t('aiResearchChatClose', 'סגירה')}
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
                'aiResearchChatIntro',
                'שאלו על ניסוח, תקציב, חוסרים במסמך או על הכנה להגשה. ההקשר נשלח מהטופס הנוכחי (גם אם חלקי).'
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
                {t('aiResearchChatThinking', 'כותב תשובה…')}
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
              placeholder={t('aiResearchChatPlaceholder', 'כתבו שאלה…')}
              rows={2}
              disabled={loading}
              aria-label={t('aiResearchChatPlaceholder', 'כתבו שאלה…')}
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
                t('aiResearchChatSend', 'שליחה')
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
        aria-label={t('aiResearchChatFabAria', 'פתיחת עוזר הצעת מחקר')}
        title={t('aiResearchChatFabAria', 'פתיחת עוזר הצעת מחקר')}
      >
        AI
      </button>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(ui, document.body);
};

export default ResearchProposalReviewAssistant;
