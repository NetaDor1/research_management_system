import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const ResearchDescriptionSection = ({ formData, handleChange }) => {
  const { t } = useLanguage();
  return (
    <div className="form-section">
      <h2>{t('researchDescriptionTitle', 'תיאור המחקר')}</h2>
      
      <div className="form-group">
        <label htmlFor="abstract">
          {t('abstractLabel', 'תקציר')}
        </label>
        <textarea
          id="abstract"
          name="abstract"
          value={formData.abstract}
          onChange={handleChange}
          placeholder={t('enterAbstract', 'הזינו תקציר המחקר')}
          rows="6"
          style={{ width: '100%', minHeight: '120px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="scientificBackground">
          {t('scientificBackgroundLabel', 'רקע מדעי ומצב טכנולוגי חדש')}
        </label>
        <textarea
          id="scientificBackground"
          name="scientificBackground"
          value={formData.scientificBackground}
          onChange={handleChange}
          placeholder={t('enterScientificBackground', 'הזינו רקע מדעי ומצב טכנולוגי חדש')}
          rows="8"
          style={{ width: '100%', minHeight: '160px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="researchObjectives">
          {t('researchObjectivesLabel', 'מטרות מחקר ומטרות ספציפיות')}
        </label>
        <textarea
          id="researchObjectives"
          name="researchObjectives"
          value={formData.researchObjectives}
          onChange={handleChange}
          placeholder={t('enterResearchObjectives', 'הזינו מטרות מחקר ומטרות ספציפיות')}
          rows="8"
          style={{ width: '100%', minHeight: '160px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="detailedDescription">
          {t('detailedDescriptionLabel', 'תיאור מפורט של המחקר המוצע')}
        </label>
        <textarea
          id="detailedDescription"
          name="detailedDescription"
          value={formData.detailedDescription}
          onChange={handleChange}
          placeholder={t('enterDetailedDescription', 'הזינו תיאור מפורט של המחקר המוצע')}
          rows="10"
          style={{ width: '100%', minHeight: '200px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="significanceInnovation">
          {t('significanceLabel', 'משמעות, חדשנות ותועלת פוטנציאלית של המחקר המוצע')}
        </label>
        <textarea
          id="significanceInnovation"
          name="significanceInnovation"
          value={formData.significanceInnovation}
          onChange={handleChange}
          placeholder={t('enterSignificance', 'הזינו משמעות, חדשנות ותועלת פוטנציאלית של המחקר המוצע')}
          rows="8"
          style={{ width: '100%', minHeight: '160px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="applicability">
          {t('applicabilityLabel', 'ישימות')}
        </label>
        <textarea
          id="applicability"
          name="applicability"
          value={formData.applicability}
          onChange={handleChange}
          placeholder={t('enterApplicability', 'הזינו ישימות המחקר')}
          rows="6"
          style={{ width: '100%', minHeight: '120px' }}
        />
      </div>
    </div>
  );
};

export default ResearchDescriptionSection;
