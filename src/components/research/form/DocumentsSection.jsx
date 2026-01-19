import React from 'react';

const DocumentsSection = ({ 
  formData, 
  handleChange, 
  handleFileUpload,
  handleDocumentChecklistChange,
  requiredDocuments
}) => {
  return (
    <div className="form-section">
      <h2>מסמכים</h2>
      
      <div className="form-group">
        <label htmlFor="researchProposalFile">
          מסמך הצעת המחקר שהוגשה
        </label>
        <input
          type="file"
          id="researchProposalFile"
          name="researchProposalFile"
          onChange={handleChange}
          accept=".pdf,.doc,.docx"
        />
        {formData.researchProposalFile && (
          <span className="file-name">{formData.researchProposalFile.name}</span>
        )}
      </div>

      <div className="form-group">
        <label>רשימת צ'קליסט של מסמכים להגשה מטעם המוסד</label>
        <div className="checklist-grid">
          {requiredDocuments.map(doc => (
            <label key={doc} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.requiredDocumentsChecklist[doc] || false}
                onChange={(e) => handleDocumentChecklistChange(doc, e.target.checked)}
              />
              {doc}
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="officialDocuments">
          מסמכים רשמיים ואישורים
        </label>
        <input
          type="file"
          id="officialDocuments"
          multiple
          onChange={(e) => handleFileUpload(e, 'official')}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        />
        {formData.officialDocuments.length > 0 && (
          <div className="uploaded-files">
            {formData.officialDocuments.map((file, index) => (
              <span key={index} className="file-name">{file.name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsSection;
