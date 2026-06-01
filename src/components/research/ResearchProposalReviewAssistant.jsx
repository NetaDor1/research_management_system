import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  buildResearchReviewPayload,
  checkReviewApiHealth,
  getResearchReviewValidationIssues,
  requestResearchAssistantChat,
  requestResearchProposalReview,
} from '../../services/researchProposalReview';
import './ResearchProposalReviewAssistant.css';

const FIELD_LABELS = {
  title: { he: 'כותרת הפרויקט', en: 'Project title' },
  abstract: { he: 'תקציר (Abstract)', en: 'Abstract' },
  methodology: {
    he: 'תיאור המחקר (מטרות, תיאור מפורט, רקע, וכו׳)',
    en: 'Research description (objectives, methods, background, …)',
  },
  budget: { he: 'תקציב (סה״כ או פירוט שורות)', en: 'Budget (total or line items)' },
};

function formatReviewForChat(result, t) {
  const lines = [
    `${t('aiResearchReviewScoreLabel')}: ${result.overallScore ?? '—'}`,
    '',
    `${t('aiResearchReviewSummary')}:`,
    result.summary || '—',
  ];

  const pushList = (titleKey, items) => {
    const arr = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!arr.length) return;
    lines.push('', `${t(titleKey)}:`);
    arr.forEach((item) => lines.push(`• ${item}`));
  };

  pushList('aiResearchReviewGrammar', result.grammarIssues);
  pushList('aiResearchReviewMissing', result.missingSections);
  pushList('aiResearchReviewScience', result.scientificConcerns);
  pushList('aiResearchReviewBudget', result.budgetSuggestions);

  return lines.join('\n');
}

const ResearchProposalReviewAssistant = ({ formData }) => {
  const { t, language, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingAction, setLoadingAction] = useState(null); // 'send' | 'review' | null
  const [error, setError] = useState('');
  const [serverOnline, setServerOnline] = useState(null);
  const listRef = useRef(null);

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
      setMessages((prev) => [...prev, { role: 'model', content: reply }]);
    } catch (e) {
      setError(e.message || (lang === 'en' ? 'Request failed' : 'הבקשה נכשלה'));
    } finally {
      setLoadingAction(null);
    }
  }, [input, loading, messages, formData, lang]);

  const runFullReview = useCallback(async () => {
    setError('');
    const issues = getResearchReviewValidationIssues(formData);
    if (issues.length > 0) {
      const parts = issues.map(({ key }) => {
        const L = FIELD_LABELS[key];
        return L ? L[lang] : key;
      });
      setError(
        lang === 'en'
          ? `Complete before full review: ${parts.join(', ')}.`
          : `לפני ביקורת מלאה יש למלא: ${parts.join(' · ')}.`
      );
      return;
    }

    setLoadingAction('review');
    try {
      const payload = buildResearchReviewPayload(formData);
      const data = await requestResearchProposalReview(payload);
      const text = `${t('aiResearchChatFullReviewTitle', 'ביקורת מלאה (מובנה)')}\n\n${formatReviewForChat(data, t)}`;
      setMessages((prev) => [...prev, { role: 'model', content: text }]);
    } catch (e) {
      setError(e.message || (lang === 'en' ? 'Request failed' : 'הבקשה נכשלה'));
    } finally {
      setLoadingAction(null);
    }
  }, [formData, lang, t]);

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
        <div className="research-ai-chat-panel" role="dialog" aria-label={t('aiResearchChatTitle', 'עוזר הצעת מחקר')}>
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

          <div className="research-ai-chat-toolbar">
            <button
              type="button"
              onClick={runFullReview}
              disabled={loading || serverOnline === false}
              aria-busy={loadingAction === 'review'}
            >
              {loadingAction === 'review' ? (
                <><span className="ai-spinner" aria-hidden="true" />{lang === 'en' ? 'Reviewing…' : 'מבצע ביקורת…'}</>
              ) : (
                t('aiResearchChatFullReview', 'ביקורת מלאה')
              )}
            </button>
            {serverOnline === false ? (
              <span className="research-ai-chat-server-hint" role="status">
                {lang === 'en' ? 'AI server offline' : 'שרת AI לא מחובר'}
              </span>
            ) : null}
          </div>

          <div className="research-ai-chat-messages" ref={listRef}>
            <p className="research-ai-chat-intro">
              {t(
                'aiResearchChatIntro',
                'שאלו על ניסוח, תקציב, חוסרים במסמך או על הכנה להגשה. ההקשר נשלח מהטופס הנוכחי (גם אם חלקי).'
              )}
            </p>
            {messages.map((m, idx) => (
              <div key={`m-${idx}`} className={`research-ai-chat-bubble-row ${m.role}`}>
                <div className={`research-ai-chat-bubble ${m.role}`}>{m.content}</div>
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
