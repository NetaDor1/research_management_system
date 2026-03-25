import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const PartnersSection = ({ 
  formData, 
  hasPartners, 
  setHasPartners,
  handlePartnerChange, 
  addPartner, 
  removePartner 
}) => {
  const { t } = useLanguage();
  return (
    <div className="form-section">
      <h2>{t('partnersProjectTitle', 'שותפים לפרוייקט')}</h2>
      
      {/* Question: Are there partners? */}
      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          {t('hasPartnersQuestion', 'האם קיימים שותפים לפרויקט?')}
        </label>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="hasPartners"
              value="yes"
              checked={hasPartners === true}
              onChange={() => setHasPartners(true)}
              style={{ cursor: 'pointer' }}
            />
            {t('yes', 'כן')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="hasPartners"
              value="no"
              checked={hasPartners === false}
              onChange={() => setHasPartners(false)}
              style={{ cursor: 'pointer' }}
            />
            {t('no', 'לא')}
          </label>
        </div>
      </div>
      
      {/* Partners section - only show if hasPartners is true */}
      {hasPartners && (
        <>
          {formData.partners.map((partner, index) => (
            <div key={index} className="partner-card">
              <div className="partner-header">
                <h3>{t('partner', 'שותף')} {index + 1}</h3>
                {formData.partners.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removePartner(index)}
                  >
                    {t('remove', 'הסר')}
                  </button>
                )}
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>{t('partnerName', 'שם השותף')}</label>
                  <input
                    type="text"
                    value={partner.name}
                    onChange={(e) => handlePartnerChange(index, 'name', e.target.value)}
                    placeholder={t('partnerName', 'שם השותף')}
                  />
                </div>
                
                <div className="form-group">
                  <label>{t('partnerEmail', 'אימייל של השותף')}</label>
                  <input
                    type="email"
                    value={partner.email}
                    onChange={(e) => handlePartnerChange(index, 'email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>{t('partnerInstitution', 'המוסד של השותף')}</label>
                  <input
                    type="text"
                    value={partner.institution}
                    onChange={(e) => handlePartnerChange(index, 'institution', e.target.value)}
                    placeholder={t('institutionName', 'שם המוסד')}
                  />
                </div>
                
                <div className="form-group">
                  <label>{t('partnerCountry', 'מדינה שבה השותף נמצא')}</label>
                  <input
                    type="text"
                    value={partner.country}
                    onChange={(e) => handlePartnerChange(index, 'country', e.target.value)}
                    placeholder={t('countryName', 'שם המדינה')}
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            type="button"
            className="btn-add-partner"
            onClick={addPartner}
          >
            + {t('addPartner', 'הוסף שותף')}
          </button>
        </>
      )}
    </div>
  );
};

export default PartnersSection;
