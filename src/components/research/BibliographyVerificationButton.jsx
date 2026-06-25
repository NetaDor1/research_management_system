import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  hasBibliographyVerificationContent,
  requestBibliographyVerification,
} from '../../services/researchProposalReview';
import './AIPolishButton.css';

const LEVEL_META = {
  high: { className: 'biblio-verify-level--high', labelHe: 'מהימנות גבוהה', labelEn: 'High reliability' },
  medium: { className: 'biblio-verify-level--medium', labelHe: 'מהימנות בינונית', labelEn: 'Medium reliability' },
  low: { className: 'biblio-verify-level--low', labelHe: 'מהימנות נמוכה', labelEn: 'Low reliability' },
  insufficient_data: { className: 'biblio-verify-level--unknown', labelHe: 'מידע לא מספיק', labelEn: 'Insufficient data' },
};

function ItemList({ items, emptyLabel }) {
  if (!items?.length) {
    return <p className="biblio-verify-empty">{emptyLabel}</p>;
  }
  return (
    <ul className="biblio-verify-list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function VerificationItemCard({ item, lang, t }) {
  const meta = LEVEL_META[item.credibilityLevel] || LEVEL_META.insufficient_data;
  return (
    <div className="biblio-verify-item-card">
      <div className="biblio-verify-item-header">
        <p className="biblio-verify-item-label">{item.label}</p>
        <div className="biblio-verify-item-scores">
          <span className={`biblio-verify-level biblio-verify-level--compact ${meta.className}`}>
            {lang === 'en' ? meta.labelEn : meta.labelHe}
          </span>
          <span className="biblio-verify-item-score">
            {t('biblioVerifyScore', 'ציון מהימנות')}: <strong>{item.score}</strong>/100
          </span>
        </div>
      </div>
      {item.concerns?.length > 0 && (
        <div className="biblio-verify-item-block">
          <h5>{t('biblioVerifyItemConcerns', 'חששות')}</h5>
          <ItemList items={item.concerns} emptyLabel="" />
        </div>
      )}
      {item.recommendations?.length > 0 && (
        <div className="biblio-verify-item-block">
          <h5>{t('biblioVerifyItemRecommendations', 'המלצות לבדיקה')}</h5>
          <ItemList items={item.recommendations} emptyLabel="" />
        </div>
      )}
    </div>
  );
}

function SectionResults({ title, items, sectionEmpty, lang, t }) {
  if (sectionEmpty) {
    return (
      <div className="biblio-verify-section">
        <h4>{title}</h4>
        <p className="biblio-verify-empty">{t('biblioVerifySectionSkipped', 'לא נבדק — השדה ריק')}</p>
      </div>
    );
  }
  if (!items?.length) {
    return (
      <div className="biblio-verify-section">
        <h4>{title}</h4>
        <p className="biblio-verify-empty">{t('biblioVerifyNoItemsParsed', 'לא זוהו פריטים נפרדים לבדיקה')}</p>
      </div>
    );
  }
  return (
    <div className="biblio-verify-section">
      <h4>{title}</h4>
      <div className="biblio-verify-items">
        {items.map((item, i) => (
          <VerificationItemCard key={item.id || i} item={item} lang={lang} t={t} />
        ))}
      </div>
    </div>
  );
}

const BibliographyVerificationButton = ({ formData }) => {
  const { t, language } = useLanguage();
  const lang = language === 'en' ? 'en' : 'he';
  const hasContent = hasBibliographyVerificationContent(formData);
  const hasPublications = Boolean(formData?.bibliographySelectedPublications?.trim());
  const hasSupport = Boolean(formData?.bibliographyResearchSupport?.trim());

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const close = () => {
    if (loading) return;
    setOpen(false);
    setError('');
    setResult(null);
  };

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await requestBibliographyVerification(formData);
      setResult(data);
    } catch (e) {
      setError(e.message || t('biblioVerifyRequestFailed', 'הבדיקה נכשלה'));
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setOpen(true);
    setError('');
    setResult(null);
    run();
  };

  const modal = open ? (
    <div
      className="ai-polish-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) close();
      }}
    >
      <div className="ai-polish-modal biblio-verify-modal" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div className="ai-polish-header biblio-verify-header">
          <span className="ai-polish-header-title">
            🔍 {t('biblioVerifyTitle', 'בדיקת מהימנות')}
          </span>
          <button type="button" className="ai-polish-close" onClick={close} disabled={loading}>
            ×
          </button>
        </div>

        <div className="ai-polish-body">
          {loading && (
            <div className="ai-polish-processing">
              <span className="ai-polish-spinner ai-polish-spinner--large" />
              <p>{t('biblioVerifyProcessing', 'בודק כל פריט בנפרד — עשוי לקחת מספר שניות…')}</p>
            </div>
          )}

          {!loading && error && <div className="ai-polish-error">{error}</div>}

          {!loading && result && (
            <div className="biblio-verify-results">
              {result.summary && <p className="biblio-verify-summary">{result.summary}</p>}

              <SectionResults
                title={t('biblioVerifyPublicationsSection', 'C. פרסומים נבחרים')}
                items={result.publications}
                sectionEmpty={!hasPublications}
                lang={lang}
                t={t}
              />

              <SectionResults
                title={t('biblioVerifySupportSection', 'D. תמיכת מחקר')}
                items={result.researchSupport}
                sectionEmpty={!hasSupport}
                lang={lang}
                t={t}
              />

              <p className="biblio-verify-disclaimer">
                {t(
                  'biblioVerifyDisclaimer',
                  'הבדיקה מבוססת על ניתוח הטקסט בלבד ואינה מהווה אימות מול מאגרים חיצוניים. יש לאמת ידנית פריטים חשובים.'
                )}
              </p>
            </div>
          )}

          <div className="ai-polish-footer">
            <div className="ai-polish-footer-start">
              <button type="button" className="ai-polish-btn-cancel" onClick={close} disabled={loading}>
                {t('close', 'סגור')}
              </button>
            </div>
            <div className="ai-polish-footer-end">
              <button
                type="button"
                className="ai-polish-btn-primary"
                onClick={run}
                disabled={loading || !hasContent}
              >
                {t('biblioVerifyRerun', 'הרץ שוב')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="ai-polish-trigger biblio-verify-trigger"
        onClick={openModal}
        disabled={!hasContent}
        title={t('biblioVerifyHint', 'בדיקת מהימנות בפרסומים נבחרים ובתמיכת מחקר')}
      >
        🔍 {t('biblioVerifyShort', 'בדיקת מהימנות')}
      </button>
      {typeof document !== 'undefined' && modal ? createPortal(modal, document.body) : null}
    </>
  );
};

export default BibliographyVerificationButton;
