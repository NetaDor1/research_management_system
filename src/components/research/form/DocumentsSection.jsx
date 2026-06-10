import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import DocumentChecklistCard from './DocumentChecklistCard';
import './DocumentChecklistCard.css';

const DocumentsSection = ({ 
  formData, 
  handleRequiredDocumentUpload,
  handleRemoveRequiredDocumentFile,
  requiredDocuments
}) => {
  const { t } = useLanguage();

  return (
    <div className="form-section">
      <h2>{t('documentsTitle', 'מסמכים')}</h2>

      <div className="form-group">
        <label>{t('documentsChecklistLabel', "רשימת צ'קליסט של מסמכים להגשה מטעם המוסד")}</label>
        <div className="documents-checklist-grid">
          {requiredDocuments.map((docName) => (
            <DocumentChecklistCard
              key={docName}
              docName={docName}
              files={formData.requiredDocumentsFiles?.[docName] || []}
              onUpload={(files) => handleRequiredDocumentUpload(docName, files)}
              onRemove={(fileIndex) => handleRemoveRequiredDocumentFile(docName, fileIndex)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentsSection;
