import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import AIPolishButton from '../AIPolishButton';
import { textInputAlign, textInputDir } from '../../../utils/textInputDirection';

const DirTextarea = ({ value, style, ...props }) => {
  const dir = textInputDir(value);
  return (
    <textarea
      {...props}
      value={value}
      dir={dir}
      style={{ textAlign: textInputAlign(dir), width: '100%', ...style }}
    />
  );
};

const FIELD_LABELS_HE = {
  abstract: 'תקציר',
  scientificBackground: 'רקע מדעי ומצב טכנולוגי',
  researchObjectives: 'מטרות המחקר',
  detailedDescription: 'תיאור מפורט',
  significanceInnovation: 'משמעות וחדשנות',
  applicability: 'ישימות',
};

const FIELD_LABELS_EN = {
  abstract: 'Abstract',
  scientificBackground: 'Scientific Background',
  researchObjectives: 'Research Objectives',
  detailedDescription: 'Detailed Description',
  significanceInnovation: 'Significance & Innovation',
  applicability: 'Applicability',
};

const ResearchDescriptionSection = ({ formData, handleChange, onPolish }) => {
  const { t, language } = useLanguage();
  const lang = language === 'en' ? 'en' : 'he';
  const fieldLabels = lang === 'en' ? FIELD_LABELS_EN : FIELD_LABELS_HE;

  const polishFields = {
    abstract: formData.abstract,
    scientificBackground: formData.scientificBackground,
    researchObjectives: formData.researchObjectives,
    detailedDescription: formData.detailedDescription,
    significanceInnovation: formData.significanceInnovation,
    applicability: formData.applicability,
  };

  return (
    <div className="form-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>{t('researchDescriptionTitle', 'תיאור המחקר')}</h2>
        {onPolish && (
          <AIPolishButton
            fields={polishFields}
            fieldLabels={fieldLabels}
            onApply={onPolish}
          />
        )}
      </div>
      
      <div className="form-group">
        <label htmlFor="abstract">
          {t('abstractLabel', 'תקציר')}
        </label>
        <DirTextarea
          id="abstract"
          name="abstract"
          value={formData.abstract}
          onChange={handleChange}
          placeholder={t('enterAbstract', 'הזינו תקציר המחקר')}
          rows="6"
          style={{ minHeight: '120px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="scientificBackground">
          {t('scientificBackgroundLabel', 'רקע מדעי ומצב טכנולוגי חדש')}
        </label>
        <DirTextarea
          id="scientificBackground"
          name="scientificBackground"
          value={formData.scientificBackground}
          onChange={handleChange}
          placeholder={t('enterScientificBackground', 'הזינו רקע מדעי ומצב טכנולוגי חדש')}
          rows="8"
          style={{ minHeight: '160px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="researchObjectives">
          {t('researchObjectivesLabel', 'מטרות מחקר ומטרות ספציפיות')}
        </label>
        <DirTextarea
          id="researchObjectives"
          name="researchObjectives"
          value={formData.researchObjectives}
          onChange={handleChange}
          placeholder={t('enterResearchObjectives', 'הזינו מטרות מחקר ומטרות ספציפיות')}
          rows="8"
          style={{ minHeight: '160px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="detailedDescription">
          {t('detailedDescriptionLabel', 'תיאור מפורט של המחקר המוצע')}
        </label>
        <DirTextarea
          id="detailedDescription"
          name="detailedDescription"
          value={formData.detailedDescription}
          onChange={handleChange}
          placeholder={t('enterDetailedDescription', 'הזינו תיאור מפורט של המחקר המוצע')}
          rows="10"
          style={{ minHeight: '200px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="significanceInnovation">
          {t('significanceLabel', 'משמעות, חדשנות ותועלת פוטנציאלית של המחקר המוצע')}
        </label>
        <DirTextarea
          id="significanceInnovation"
          name="significanceInnovation"
          value={formData.significanceInnovation}
          onChange={handleChange}
          placeholder={t('enterSignificance', 'הזינו משמעות, חדשנות ותועלת פוטנציאלית של המחקר המוצע')}
          rows="8"
          style={{ minHeight: '160px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="applicability">
          {t('applicabilityLabel', 'ישימות')}
        </label>
        <DirTextarea
          id="applicability"
          name="applicability"
          value={formData.applicability}
          onChange={handleChange}
          placeholder={t('enterApplicability', 'הזינו ישימות המחקר')}
          rows="6"
          style={{ minHeight: '120px' }}
        />
      </div>
    </div>
  );
};

export default ResearchDescriptionSection;
