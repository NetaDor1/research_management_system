import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { normalizeAcademicYear } from '../../utils/academicYear';

const ResearchPeriodSection = ({ researchData }) => {
  const { t, language, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const locale = language === 'en' ? 'en-US' : 'he-IL';
  const notSpecified = t('notSpecified', 'לא צוין');

  const formatDate = (timestamp) => {
    if (!timestamp) return notSpecified;
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString(locale);
      }
      if (timestamp && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString(locale);
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString(locale);
      }
      return String(timestamp);
    } catch (e) {
      return String(timestamp);
    }
  };

  if (!researchData) return null;
  const displayAcademicYear = normalizeAcademicYear(
    researchData.academicYear,
    researchData.researchStartDate
  );

  return (
    <div style={{ 
      background: '#f9f9f9', 
      padding: '30px', 
      borderRadius: '8px',
      marginBottom: '20px',
      textAlign,
    }}>
      <h2 style={{ marginBottom: '20px', color: '#667eea' }}>
        {t('researchPeriod', 'תקופת המחקר')}
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            {t('startDateShort', 'תאריך התחלה')}:
          </label>
          <span style={{ fontSize: '16px' }}>{formatDate(researchData.researchStartDate)}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            {t('endDateShort', 'תאריך סיום')}:
          </label>
          <span style={{ fontSize: '16px' }}>{formatDate(researchData.researchEndDate)}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            {t('researchDurationYears', 'משך המחקר (שנים)')}:
          </label>
          <span style={{ fontSize: '16px' }}>{researchData.researchDurationYears || notSpecified}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            {t('academicYearShort', 'שנה אקדמית')}:
          </label>
          <span style={{ fontSize: '16px' }}>{displayAcademicYear || notSpecified}</span>
        </div>
      </div>
    </div>
  );
};

export default ResearchPeriodSection;
