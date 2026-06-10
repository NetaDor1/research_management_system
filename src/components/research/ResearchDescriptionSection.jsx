import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const ResearchDescriptionSection = ({ researchData }) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';

  if (!researchData) return null;

  const hasDescriptionData =
    researchData.abstract ||
    researchData.scientificBackground ||
    researchData.researchObjectives ||
    researchData.detailedDescription ||
    researchData.significanceInnovation ||
    researchData.applicability;

  if (!hasDescriptionData) return null;

  const fieldStyle = {
    fontSize: '16px',
    lineHeight: '1.8',
    whiteSpace: 'pre-wrap',
    background: '#fff',
    padding: '15px',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
  };

  const headingStyle = {
    marginBottom: '10px',
    color: '#495057',
    fontSize: '18px',
    fontWeight: 'bold',
  };

  const fields = [
    { key: 'abstract', label: t('abstractLabel', 'תקציר'), value: researchData.abstract },
    { key: 'scientificBackground', label: t('scientificBackgroundLabel', 'רקע מדעי ומצב טכנולוגי חדש'), value: researchData.scientificBackground },
    { key: 'researchObjectives', label: t('researchObjectivesLabel', 'מטרות מחקר ומטרות ספציפיות'), value: researchData.researchObjectives },
    { key: 'detailedDescription', label: t('detailedDescriptionLabel', 'תיאור מפורט של המחקר המוצע'), value: researchData.detailedDescription },
    { key: 'significanceInnovation', label: t('significanceLabel', 'משמעות, חדשנות ותועלת פוטנציאלית'), value: researchData.significanceInnovation },
    { key: 'applicability', label: t('applicabilityLabel', 'ישימות'), value: researchData.applicability },
  ];

  return (
    <div style={{
      background: '#f9f9f9',
      padding: '30px',
      borderRadius: '8px',
      marginBottom: '20px',
      textAlign,
    }}>
      <h2 style={{ marginBottom: '20px', color: '#667eea' }}>
        {t('researchDescriptionTitle', 'תיאור המחקר')}
      </h2>

      {fields.map(({ key, label, value }) =>
        value ? (
          <div key={key} style={{ marginBottom: '25px' }}>
            <h3 style={headingStyle}>{label}</h3>
            <p style={fieldStyle}>{value}</p>
          </div>
        ) : null
      )}
    </div>
  );
};

export default ResearchDescriptionSection;
