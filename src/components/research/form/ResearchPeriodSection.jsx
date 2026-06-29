import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const ResearchPeriodSection = ({ formData, errors, handleChange }) => {
  const { t } = useLanguage();
  return (
    <div className="form-section">
      <h2>{t('researchPeriod', 'תקופת המחקר')}</h2>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="researchDurationYears">
            {t('totalResearchYears', 'סה"כ תקופת המחקר בשנים')} <span className="required">*</span>
          </label>
          <input
            type="number"
            id="researchDurationYears"
            name="researchDurationYears"
            value={formData.researchDurationYears}
            onChange={handleChange}
            className={errors.researchDurationYears ? 'error' : ''}
            placeholder={t('enterResearchDurationYears', 'הזן מספר שנים')}
            min="0"
            step="0.5"
            style={{ maxWidth: '170px', width: '100%' }}
          />
          {errors.researchDurationYears && (
            <span className="error-message">{errors.researchDurationYears}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearchPeriodSection;
