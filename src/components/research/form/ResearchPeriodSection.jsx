import React, { useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const ResearchPeriodSection = ({ 
  formData, 
  errors, 
  handleChange, 
  handleDatePickerChange,
  formatDateForDisplay,
  convertDateToISO,
  startDatePickerRef,
  endDatePickerRef
}) => {
  const { t } = useLanguage();
  return (
    <div className="form-section">
      <h2>{t('researchPeriod', 'תקופת המחקר')}</h2>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="researchStartDate">
            {t('startDateLabel', 'תאריך לועזי של תחילת המחקר (dd/mm/yyyy)')} <span className="required">*</span>
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
            <input
              type="text"
              id="researchStartDate"
              name="researchStartDate"
              value={formatDateForDisplay(formData.researchStartDate)}
              onChange={handleChange}
              className={errors.researchStartDate ? 'error' : ''}
              placeholder="dd/mm/yyyy"
              maxLength="10"
              style={{ flex: 1 }}
            />
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input
                type="date"
                ref={startDatePickerRef}
                value={convertDateToISO(formData.researchStartDate) || ''}
                onChange={(e) => handleDatePickerChange('researchStartDate', e.target.value)}
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
                title={t('chooseDate', 'בחר תאריך מלוח שנה')}
              />
              <div
                style={{
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8f9fa',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  minWidth: '40px',
                  height: '40px',
                  transition: 'all 0.2s',
                  margin: 0,
                  pointerEvents: 'none'
                }}
                onMouseEnter={(e) => {
                  const parent = e.target.parentElement;
                  if (parent) {
                    parent.style.background = '#e9ecef';
                    parent.style.borderColor = '#667eea';
                  }
                }}
                onMouseLeave={(e) => {
                  const parent = e.target.parentElement;
                  if (parent) {
                    parent.style.background = '#f8f9fa';
                    parent.style.borderColor = '#e9ecef';
                  }
                }}
              >
                📅
              </div>
            </div>
          </div>
          {errors.researchStartDate && <span className="error-message">{errors.researchStartDate}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="researchEndDate">
            {t('endDateLabel', 'תאריך לועזי של סוף המחקר (dd/mm/yyyy)')} <span className="required">*</span>
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
            <input
              type="text"
              id="researchEndDate"
              name="researchEndDate"
              value={formatDateForDisplay(formData.researchEndDate)}
              onChange={handleChange}
              className={errors.researchEndDate ? 'error' : ''}
              placeholder="dd/mm/yyyy"
              maxLength="10"
              style={{ flex: 1 }}
            />
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input
                type="date"
                ref={endDatePickerRef}
                value={convertDateToISO(formData.researchEndDate) || ''}
                onChange={(e) => handleDatePickerChange('researchEndDate', e.target.value)}
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
                title={t('chooseDate', 'בחר תאריך מלוח שנה')}
              />
              <div
                style={{
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8f9fa',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  minWidth: '40px',
                  height: '40px',
                  transition: 'all 0.2s',
                  margin: 0,
                  pointerEvents: 'none'
                }}
                onMouseEnter={(e) => {
                  const parent = e.target.parentElement;
                  if (parent) {
                    parent.style.background = '#e9ecef';
                    parent.style.borderColor = '#667eea';
                  }
                }}
                onMouseLeave={(e) => {
                  const parent = e.target.parentElement;
                  if (parent) {
                    parent.style.background = '#f8f9fa';
                    parent.style.borderColor = '#e9ecef';
                  }
                }}
              >
                📅
              </div>
            </div>
          </div>
          {errors.researchEndDate && <span className="error-message">{errors.researchEndDate}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="researchDurationYears">
            {t('totalResearchYears', 'סה"כ תקופת המחקר בשנים (חישוב אוטומטי)')}
          </label>
          <input
            type="text"
            id="researchDurationYears"
            name="researchDurationYears"
            value={formData.researchDurationYears}
            readOnly
            className="readonly-field"
            placeholder={t('autoCalculated', 'יחושב אוטומטית')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="academicYear">
            {t('academicYearLabel', 'שנה אקדמית (תרגום אוטומטי)')}
          </label>
          <input
            type="text"
            id="academicYear"
            name="academicYear"
            value={formData.academicYear}
            readOnly
            className="readonly-field"
            placeholder={t('autoCalculated', 'יחושב אוטומטית')}
          />
        </div>
      </div>
    </div>
  );
};

export default ResearchPeriodSection;
