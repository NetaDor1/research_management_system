import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const DigitalSignatureSection = ({ formData, handleDigitalSignature }) => {
  const { t } = useLanguage();
  return (
    <div className="form-section">
      <h2>{t('digitalSignatureTitle', 'חתימה דיגיטלית')}</h2>
      
      <div className="form-group">
        <label>{t('institutionalSignatures', 'חתימת מורשי חתימה מוסדיים')}</label>
        {!formData.digitalSignature.signed ? (
          <button
            type="button"
            className="btn-signature"
            onClick={handleDigitalSignature}
          >
            {t('digitalSignButton', 'חתימה דיגיטלית')}
          </button>
        ) : (
          <div className="signature-info">
            <p>✓ {t('signedBy', 'חתום על ידי')}: {formData.digitalSignature.signer}</p>
            <p>{t('signatureDate', 'תאריך חתימה')}: {formData.digitalSignature.date}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalSignatureSection;
