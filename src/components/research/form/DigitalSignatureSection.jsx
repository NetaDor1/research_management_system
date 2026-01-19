import React from 'react';

const DigitalSignatureSection = ({ formData, handleDigitalSignature }) => {
  return (
    <div className="form-section">
      <h2>חתימה דיגיטלית</h2>
      
      <div className="form-group">
        <label>חתימת מורשי חתימה מוסדיים</label>
        {!formData.digitalSignature.signed ? (
          <button
            type="button"
            className="btn-signature"
            onClick={handleDigitalSignature}
          >
            חתימה דיגיטלית
          </button>
        ) : (
          <div className="signature-info">
            <p>✓ חתום על ידי: {formData.digitalSignature.signer}</p>
            <p>תאריך חתימה: {formData.digitalSignature.date}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalSignatureSection;
