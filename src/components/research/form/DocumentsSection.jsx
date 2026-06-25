import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import DocumentChecklistCard from './DocumentChecklistCard';
import './DocumentChecklistCard.css';

const DocumentsSection = ({ 
  formData, 
  handleRequiredDocumentUpload,
  handleRemoveRequiredDocumentFile,
  requiredDocuments,
  documentsUploading = false,
}) => {
  const { t } = useLanguage();

  return (
    <div className="form-section">
      <h2>{t('documentsTitle', 'מסמכים')}</h2>

      <div className="form-group">
        <label>{t('documentsChecklistLabel', "רשימת צ'קליסט של מסמכים להגשה מטעם המוסד")}</label>
        {documentsUploading && (
          <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '14px' }}>
            {t('uploadingFiles', 'מעלה קבצים...')}
          </p>
        )}
        <div className="documents-checklist-grid">
          {requiredDocuments.map((doc) => {
            const docKey = typeof doc === 'string' ? doc : doc.key;
            const docLabel = typeof doc === 'string' ? doc : doc.label;
            return (
            <DocumentChecklistCard
              key={docKey}
              docName={docKey}
              displayLabel={docLabel}
              files={formData.requiredDocumentsFiles?.[docKey] || []}
              onUpload={(files) => handleRequiredDocumentUpload(docKey, files)}
              onRemove={(fileIndex) => handleRemoveRequiredDocumentFile(docKey, fileIndex)}
              disabled={documentsUploading}
            />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DocumentsSection;
