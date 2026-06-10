import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const AdditionalInfoSection = ({ researchData }) => {
  const { t, language, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const locale = language === 'en' ? 'en-US' : 'he-IL';

  const formatDate = (timestamp) => {
    if (!timestamp) return t('notSpecified', 'לא צוין');
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

  return (
    <>
      <div style={{ 
        background: '#f9f9f9', 
        padding: '30px', 
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign,
      }}>
        <h2 style={{ marginBottom: '20px', color: '#667eea' }}>
          {t('additionalInfoTitle', 'מידע נוסף')}
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
              {t('expectedResponseDateShort', 'תאריך תגובה צפוי')}:
            </label>
            <span style={{ fontSize: '16px' }}>
              {formatDate(researchData.expectedResponseDate)}
            </span>
          </div>
        </div>
      </div>

      {researchData.notes && (
        <div style={{ 
          background: '#f9f9f9', 
          padding: '30px', 
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign,
        }}>
          <h2 style={{ marginBottom: '20px', color: '#667eea' }}>
            {t('notes', 'הערות')}
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6' }}>{researchData.notes}</p>
        </div>
      )}
    </>
  );
};

export default AdditionalInfoSection;
