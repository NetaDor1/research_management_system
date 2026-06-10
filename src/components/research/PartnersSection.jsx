import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const PartnersSection = ({ researchData }) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const notSpecified = t('notSpecified', 'לא צוין');

  if (!researchData || !researchData.partners || researchData.partners.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      background: '#f9f9f9', 
      padding: '30px', 
      borderRadius: '8px',
      marginBottom: '20px',
      textAlign,
    }}>
      <h2 style={{ marginBottom: '20px', color: '#667eea' }}>
        {t('partners', 'שותפים')}
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {researchData.partners.map((partner, index) => (
          <div key={index} style={{
            padding: '20px',
            background: '#fff',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold', color: '#666', marginInlineEnd: '10px' }}>
                {t('name', 'שם')}:
              </label>
              <span>{partner.name || notSpecified}</span>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold', color: '#666', marginInlineEnd: '10px' }}>
                {t('email', 'אימייל')}:
              </label>
              <span>{partner.email || notSpecified}</span>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold', color: '#666', marginInlineEnd: '10px' }}>
                {t('institution', 'מוסד')}:
              </label>
              <span>{partner.institution || notSpecified}</span>
            </div>
            {partner.country && (
              <div>
                <label style={{ fontWeight: 'bold', color: '#666', marginInlineEnd: '10px' }}>
                  {t('country', 'מדינה')}:
                </label>
                <span>{partner.country}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartnersSection;
