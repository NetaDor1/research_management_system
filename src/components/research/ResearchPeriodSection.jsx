import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { isResearchAwarded, resolveResearchPeriodDates } from '../../utils/researchPeriod';

const ResearchPeriodSection = ({ researchData }) => {
  const { t, language, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const locale = language === 'en' ? 'en-US' : 'he-IL';
  const notSpecified = t('notSpecified', 'לא צוין');

  if (!researchData || !isResearchAwarded(researchData)) return null;

  const { durationYears, startDate, endDate } = resolveResearchPeriodDates(researchData);

  const formatDate = (date) => {
    if (!date) return notSpecified;
    try {
      return date.toLocaleDateString(locale);
    } catch {
      return notSpecified;
    }
  };

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
      }}>
        <div>
          <label style={{
            display: 'block',
            fontWeight: 'bold',
            marginBottom: '5px',
            color: '#666',
          }}>
            {t('totalResearchYears', 'סה"כ תקופת המחקר בשנים')}:
          </label>
          <span style={{ fontSize: '16px' }}>
            {durationYears ?? researchData.researchDurationYears ?? notSpecified}
          </span>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontWeight: 'bold',
            marginBottom: '5px',
            color: '#666',
          }}>
            {t('researchPeriodStartDate', 'תאריך תחילת המחקר')}:
          </label>
          <span style={{ fontSize: '16px' }}>{formatDate(startDate)}</span>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontWeight: 'bold',
            marginBottom: '5px',
            color: '#666',
          }}>
            {t('researchPeriodEndDate', 'תאריך סיום המחקר')}:
          </label>
          <span style={{ fontSize: '16px' }}>{formatDate(endDate)}</span>
        </div>
      </div>
    </div>
  );
};

export default ResearchPeriodSection;
