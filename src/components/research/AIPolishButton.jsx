import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import { requestPolishText } from '../../services/researchProposalReview';
import PolishDiffView from './PolishDiffView';
import './AIPolishButton.css';

const ACTION_META = {
  improve: {
    headerClass: 'ai-polish-header--improve',
    badgeClass: 'ai-polish-action-badge--improve',
    icon: '✏️',
    triggerClass: 'ai-polish-trigger--improve',
  },
  fix: {
    headerClass: 'ai-polish-header--fix',
    badgeClass: 'ai-polish-action-badge--fix',
    icon: '✓',
    triggerClass: 'ai-polish-trigger--fix',
  },
  translate: {
    headerClass: 'ai-polish-header--translate',
    badgeClass: 'ai-polish-action-badge--translate',
    icon: '🌐',
    triggerClass: 'ai-polish-trigger--translate',
  },
};

const ACTION_COPY_KEYS = {
  improve: {
    title: ['aiPolishImproveTitle', 'שיפור ניסוח'],
    desc: ['aiPolishImproveDesc', 'בחרו אילו שדות לשפר. הטקסט יישאר באותה שפה — ניסוח, בהירות ותיקון שגיאות.'],
    run: ['aiPolishRunImprove', 'שפר שדות מסומנים'],
    results: ['aiPolishResultsImprove', 'להלן הניסוח המשופר. סמנו את השדות שברצונכם להחיל:'],
    badge: ['aiPolishBadgeImprove', 'שיפור ניסוח — אותה שפה'],
    hint: ['aiPolishImproveHint', 'שפר ניסוח ובהירות — באותה שפה'],
    short: ['aiPolishImproveShort', 'שפר ניסוח'],
  },
  fix: {
    title: ['aiPolishFixTitle', 'תיקון שגיאות כתיב'],
    desc: ['aiPolishFixDesc', 'בחרו אילו שדות לבדוק. יתוקנו שגיאות כתיב, דקדוק, פיסוק ומילים שגויות בהקשר (גם אם הן מילים "תקינות" במילון).'],
    run: ['aiPolishRunFix', 'תקן שדות מסומנים'],
    results: ['aiPolishResultsFix', 'להלן הטקסט לאחר תיקון שגיאות. סמנו את השדות שברצונכם להחיל:'],
    badge: ['aiPolishBadgeFix', 'תיקון שגיאות — אותה שפה'],
    hint: ['aiPolishFixHint', 'תקן שגיאות כתיב, דקדוק ופיסוק — בלי לשנות ניסוח'],
    short: ['aiPolishFixShort', 'תקן שגיאות'],
  },
  translate: {
    title: ['aiPolishTranslateTitle', 'תרגום לאנגלית'],
    desc: ['aiPolishTranslateDesc', 'בחרו אילו שדות לתרגם. כל שדה מסומן יתורגם לאנגלית אקדמית מקצועית.'],
    run: ['aiPolishRunTranslate', 'תרגם שדות מסומנים'],
    results: ['aiPolishResultsTranslate', 'להלן התרגום לאנגלית. סמנו את השדות שברצונכם להחיל:'],
    badge: ['aiPolishBadgeTranslate', 'תרגום לאנגלית אקדמית'],
    hint: ['aiPolishTranslateHint', 'תרגם לאנגלית אקדמית מקצועית'],
    short: ['aiPolishTranslateShort', 'תרגם לאנגלית'],
  },
};

const AIPolishButton = ({ fields, fieldLabels, onApply }) => {
  const { t, language } = useLanguage();
  const lang = language === 'en' ? 'en' : 'he';

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('improve');
  const [step, setStep] = useState('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [originals, setOriginals] = useState({});
  const [selectedFields, setSelectedFields] = useState({});
  const [selectedResults, setSelectedResults] = useState({});

  const nonEmpty = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(fields).filter(([, v]) => typeof v === 'string' && v.trim())
      ),
    [fields]
  );
  const hasContent = Object.keys(nonEmpty).length > 0;

  const openModal = (nextAction) => {
    const keys = Object.keys(nonEmpty);
    setAction(nextAction);
    setStep('select');
    setResults(null);
    setOriginals({});
    setError('');
    setSelectedFields(Object.fromEntries(keys.map((k) => [k, true])));
    setSelectedResults({});
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setStep('select');
    setResults(null);
    setOriginals({});
    setError('');
    setLoading(false);
  };

  const selectedForRun = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(nonEmpty).filter(([k]) => selectedFields[k])
      ),
    [nonEmpty, selectedFields]
  );

  const selectedCount = Object.keys(selectedForRun).length;

  const toggleField = (key) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllFields = () => {
    setSelectedFields(Object.fromEntries(Object.keys(nonEmpty).map((k) => [k, true])));
  };

  const clearAllFields = () => {
    setSelectedFields(Object.fromEntries(Object.keys(nonEmpty).map((k) => [k, false])));
  };

  const run = async () => {
    if (selectedCount === 0) {
      setError(t('aiPolishSelectAtLeastOne', 'יש לבחור לפחות שדה אחד'));
      return;
    }

    setLoading(true);
    setError('');
    setStep('processing');
    try {
      const { improved } = await requestPolishText({ action, fields: selectedForRun });
      const validImproved = Object.fromEntries(
        Object.entries(improved).filter(([k]) => fieldLabels[k] !== undefined && selectedForRun[k])
      );
      setOriginals(selectedForRun);
      setResults(validImproved);
      setSelectedResults(Object.fromEntries(Object.keys(validImproved).map((k) => [k, true])));
      setStep('results');
    } catch (e) {
      setError(e.message || t('aiPolishRequestFailed', 'הבקשה נכשלה'));
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    const toApply = Object.fromEntries(
      Object.entries(results).filter(([k]) => selectedResults[k])
    );
    if (Object.keys(toApply).length > 0) onApply(toApply);
    close();
  };

  const copy = ACTION_COPY_KEYS[action] || ACTION_COPY_KEYS.improve;
  const actionTitle = t(copy.title[0], copy.title[1]);
  const actionDesc = t(copy.desc[0], copy.desc[1]);
  const runButtonLabel = t(copy.run[0], copy.run[1]);
  const resultsDesc = t(copy.results[0], copy.results[1]);
  const badgeLabel = t(copy.badge[0], copy.badge[1]);

  const meta = ACTION_META[action] || ACTION_META.improve;

  const modal = open ? (
    <div
      className="ai-polish-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) close();
      }}
    >
      <div className="ai-polish-modal" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div className={`ai-polish-header ${meta.headerClass}`}>
          <span className="ai-polish-header-title">
            {meta.icon} {actionTitle}
          </span>
          <button type="button" className="ai-polish-close" onClick={close} disabled={loading}>
            ×
          </button>
        </div>

        {step === 'processing' && (
          <div className="ai-polish-body ai-polish-processing">
            <span className="ai-polish-spinner ai-polish-spinner--large" />
            <p>{t('aiPolishProcessing', 'מעבד את השדות…')}</p>
          </div>
        )}

        {step === 'select' && (
          <div className="ai-polish-body">
            <p className="ai-polish-desc">{actionDesc}</p>

            <div className="ai-polish-field-toolbar">
              <span className="ai-polish-field-count">
                {t('aiPolishFieldsSelected', '{count} שדות נבחרו').replace(
                  '{count}',
                  String(selectedCount)
                )}
              </span>
              <div className="ai-polish-field-toolbar-actions">
                <button type="button" className="ai-polish-link-btn" onClick={selectAllFields}>
                  {t('selectAll', 'בחר הכל')}
                </button>
                <button type="button" className="ai-polish-link-btn" onClick={clearAllFields}>
                  {t('clearAll', 'נקה הכל')}
                </button>
              </div>
            </div>

            <div className="ai-polish-field-list">
              {Object.keys(nonEmpty).map((field) => (
                <label key={field} className={`ai-polish-field-item${selectedFields[field] ? ' selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedFields[field] ?? false}
                    onChange={() => toggleField(field)}
                  />
                  <div className="ai-polish-field-item-content">
                    <strong>{fieldLabels[field] || field}</strong>
                    <span className="ai-polish-field-preview">
                      {nonEmpty[field].trim().slice(0, 120)}
                      {nonEmpty[field].trim().length > 120 ? '…' : ''}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {error && <div className="ai-polish-error">{error}</div>}

            <div className="ai-polish-footer">
              <div className="ai-polish-footer-start">
                <button type="button" className="ai-polish-btn-cancel" onClick={close}>
                  {t('cancel', 'ביטול')}
                </button>
              </div>
              <div className="ai-polish-footer-end">
                <button
                  type="button"
                  className="ai-polish-btn-primary"
                  onClick={run}
                  disabled={loading || selectedCount === 0}
                >
                  {runButtonLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'results' && results && (
          <div className="ai-polish-body">
            <div className={`ai-polish-action-badge ${meta.badgeClass}`}>
              {badgeLabel}
            </div>
            <p className="ai-polish-desc">{resultsDesc}</p>

            <div className="ai-polish-results">
              {Object.entries(results).map(([field, text]) => (
                <div key={field} className="ai-polish-result-field">
                  <label className="ai-polish-result-label">
                    <input
                      type="checkbox"
                      checked={selectedResults[field] ?? true}
                      onChange={(e) =>
                        setSelectedResults((prev) => ({ ...prev, [field]: e.target.checked }))
                      }
                    />
                    <strong>{fieldLabels[field] || field}</strong>
                  </label>
                  {originals[field] && (
                    <>
                      <PolishDiffView
                        originalText={originals[field]}
                        revisedText={text}
                        originalLabel={t('aiPolishOriginalLabel', 'מקור')}
                        revisedLabel={
                          action === 'translate'
                            ? t('aiPolishTranslationLabel', 'תרגום')
                            : t('aiPolishCorrectedLabel', 'מתוקן')
                        }
                        legend={
                          action === 'translate'
                            ? null
                            : t('aiPolishDiffLegend', 'מילים שהשתנו מסומנות באדום')
                        }
                        highlightChanges={action !== 'translate'}
                      />
                      <label className="ai-polish-edit-label" htmlFor={`polish-edit-${field}`}>
                        {t('aiPolishEditBeforeApply', 'עריכה לפני החלה (אופציונלי)')}
                      </label>
                    </>
                  )}
                  <textarea
                    id={`polish-edit-${field}`}
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
              <div className="ai-polish-footer-start">
                <button
                  type="button"
                  className="ai-polish-btn-secondary"
                  onClick={() => {
                    setResults(null);
                    setOriginals({});
                    setError('');
                    setStep('select');
                  }}
                >
                  {t('back', 'חזור')}
                </button>
                <button type="button" className="ai-polish-btn-cancel" onClick={close}>
                  {t('cancel', 'ביטול')}
                </button>
              </div>
              <div className="ai-polish-footer-end">
                <button type="button" className="ai-polish-btn-primary" onClick={apply}>
                  {t('aiPolishApplySelected', 'החל מסומנים')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="ai-polish-triggers">
      {(['improve', 'fix', 'translate']).map((actionKey) => {
        const actionCopy = ACTION_COPY_KEYS[actionKey];
        const actionMeta = ACTION_META[actionKey];
        return (
          <button
            key={actionKey}
            type="button"
            className={`ai-polish-trigger ${actionMeta.triggerClass}`}
            onClick={() => openModal(actionKey)}
            disabled={!hasContent}
            title={t(actionCopy.hint[0], actionCopy.hint[1])}
          >
            {actionMeta.icon} {t(actionCopy.short[0], actionCopy.short[1])}
          </button>
        );
      })}
      {typeof document !== 'undefined' && modal ? createPortal(modal, document.body) : null}
    </div>
  );
};

export default AIPolishButton;
