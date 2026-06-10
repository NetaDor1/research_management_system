import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { requestPolishText } from '../../services/researchProposalReview';
import './AIPolishButton.css';

const ACTIONS = [
  { value: 'improve', labelHe: 'שפר ניסוח — מקצועי, ברור, ללא שגיאות (אותה שפה)', labelEn: 'Improve phrasing — professional, clear, error-free (same language)' },
  { value: 'translate', labelHe: 'תרגם לאנגלית מקצועית אקדמית', labelEn: 'Translate to professional academic English' },
];

const AIPolishButton = ({ fields, fieldLabels, onApply, lang = 'he' }) => {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('improve');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState({});

  const nonEmpty = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => typeof v === 'string' && v.trim())
  );
  const hasContent = Object.keys(nonEmpty).length > 0;

  const openModal = () => {
    setResults(null);
    setError('');
    setAction('improve');
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setResults(null);
    setError('');
    setLoading(false);
  };

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const { improved } = await requestPolishText({ action, fields: nonEmpty });
      const validImproved = Object.fromEntries(
        Object.entries(improved).filter(([k]) => fieldLabels[k] !== undefined)
      );
      setResults(validImproved);
      setSelected(Object.fromEntries(Object.keys(validImproved).map((k) => [k, true])));
    } catch (e) {
      setError(e.message || (lang === 'he' ? 'הבקשה נכשלה' : 'Request failed'));
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    const toApply = Object.fromEntries(
      Object.entries(results).filter(([k]) => selected[k])
    );
    if (Object.keys(toApply).length > 0) onApply(toApply);
    close();
  };

  const modal = open ? (
    <div className="ai-polish-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="ai-polish-modal" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div className="ai-polish-header">
          <span className="ai-polish-header-title">
            {lang === 'he' ? '✨ שיפור ניסוח / תרגום' : '✨ AI Text Polish'}
          </span>
          <button className="ai-polish-close" onClick={close}>×</button>
        </div>

        {!results ? (
          <div className="ai-polish-body">
            <p className="ai-polish-desc">
              {lang === 'he'
                ? `יישלחו ${Object.keys(nonEmpty).length} שדות ל-AI. בחרו פעולה:`
                : `${Object.keys(nonEmpty).length} fields will be sent to AI. Choose action:`}
            </p>
            <div className="ai-polish-actions">
              {ACTIONS.map((a) => (
                <label key={a.value} className={`ai-polish-action-item${action === a.value ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    name="polish-action"
                    value={a.value}
                    checked={action === a.value}
                    onChange={() => setAction(a.value)}
                  />
                  <span>{lang === 'he' ? a.labelHe : a.labelEn}</span>
                </label>
              ))}
            </div>
            {error && <div className="ai-polish-error">{error}</div>}
            <div className="ai-polish-footer">
              <button className="ai-polish-btn-primary" onClick={run} disabled={loading}>
                {loading
                  ? <><span className="ai-polish-spinner" />{lang === 'he' ? ' מעבד…' : ' Processing…'}</>
                  : (lang === 'he' ? 'בצע' : 'Run')}
              </button>
              <button className="ai-polish-btn-cancel" onClick={close}>{lang === 'he' ? 'בטל' : 'Cancel'}</button>
            </div>
          </div>
        ) : (
          <div className="ai-polish-body">
            <p className="ai-polish-desc">
              {lang === 'he' ? 'סמנו את השדות שברצונכם להחיל:' : 'Select fields to apply:'}
            </p>
            <div className="ai-polish-results">
              {Object.entries(results).map(([field, text]) => (
                <div key={field} className="ai-polish-result-field">
                  <label className="ai-polish-result-label">
                    <input
                      type="checkbox"
                      checked={selected[field] ?? true}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [field]: e.target.checked }))}
                    />
                    <strong>{fieldLabels[field] || field}</strong>
                  </label>
                  <textarea
                    className="ai-polish-result-textarea"
                    value={text}
                    onChange={(e) => setResults((prev) => ({ ...prev, [field]: e.target.value }))}
                    rows={4}
                    dir="auto"
                  />
                </div>
              ))}
            </div>
            {error && <div className="ai-polish-error">{error}</div>}
            <div className="ai-polish-footer">
              <button className="ai-polish-btn-primary" onClick={apply}>
                {lang === 'he' ? 'החל מסומנים' : 'Apply selected'}
              </button>
              <button
                className="ai-polish-btn-secondary"
                onClick={() => { setResults(null); setError(''); }}
              >
                {lang === 'he' ? 'חזור' : 'Back'}
              </button>
              <button className="ai-polish-btn-cancel" onClick={close}>{lang === 'he' ? 'בטל' : 'Cancel'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="ai-polish-trigger"
        onClick={openModal}
        disabled={!hasContent}
        title={lang === 'he' ? 'שפר / תרגם עם AI' : 'Polish / Translate with AI'}
      >
        ✨ {lang === 'he' ? 'שפר / תרגם' : 'Polish / Translate'}
      </button>
      {typeof document !== 'undefined' && modal ? createPortal(modal, document.body) : null}
    </>
  );
};

export default AIPolishButton;
