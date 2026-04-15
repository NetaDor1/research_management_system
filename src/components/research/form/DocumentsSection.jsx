import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const DocumentsSection = ({ 
  formData, 
  handleChange, 
  handleFileUpload,
  handleRequiredDocumentUpload,
  handleRemoveRequiredDocumentFile,
  requiredDocuments
}) => {
  const { t } = useLanguage();

  const getFileName = (fileItem) => {
    if (!fileItem) return '';
    if (typeof fileItem === 'string') return fileItem;
    return fileItem.name || fileItem.fileName || 'file';
  };

  const getFileUrl = (fileItem) => {
    if (!fileItem) return '';
    if (typeof fileItem === 'string') return fileItem;
    if (fileItem.url) return fileItem.url;
    if (fileItem instanceof File) return URL.createObjectURL(fileItem);
    return '';
  };

  return (
    <div className="form-section">
      <h2>{t('documentsTitle', 'מסמכים')}</h2>
      
      <div className="form-group">
        <label htmlFor="researchProposalFile">
          {t('researchProposalFileLabel', 'מסמך הצעת המחקר שהוגשה')}
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
        <label>{t('documentsChecklistLabel', "רשימת צ'קליסט של מסמכים להגשה מטעם המוסד")}</label>
        <div style={{ display: 'grid', gap: '12px' }}>
          {requiredDocuments.map((docName) => {
            const filesForDoc = formData.requiredDocumentsFiles?.[docName] || [];
            return (
              <div
                key={docName}
                style={{
                  border: '1px solid #dbe2ea',
                  borderRadius: '8px',
                  background: '#fff',
                  padding: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: filesForDoc.length > 0 ? '10px' : 0,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={filesForDoc.length > 0} readOnly />
                    <strong>{docName}</strong>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>
                      ({filesForDoc.length} {t('uploadedFilesCount', 'קבצים')})
                    </span>
                  </div>

                  <label
                    style={{
                      cursor: 'pointer',
                      background: '#667eea',
                      color: 'white',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  >
                    {t('uploadFiles', 'העלאת קבצים')}
                    <input
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        handleRequiredDocumentUpload(docName, e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {filesForDoc.length > 0 && (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {filesForDoc.map((fileItem, fileIndex) => {
                      const fileName = getFileName(fileItem);
                      const fileUrl = getFileUrl(fileItem);
                      return (
                        <div
                          key={`${docName}-${fileIndex}-${fileName}`}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '8px 10px',
                          }}
                        >
                          <span style={{ flex: 1, wordBreak: 'break-word' }}>{fileName}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {fileUrl && (
                              <>
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                  {t('previewFile', 'תצוגה מקדימה')}
                                </a>
                                <a href={fileUrl} download={fileName}>
                                  {t('downloadFile', 'הורדה')}
                                </a>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveRequiredDocumentFile(docName, fileIndex)}
                              style={{
                                border: '1px solid #cbd5e1',
                                background: 'white',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                              }}
                            >
                              {t('remove', 'הסר')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="officialDocuments">
          {t('officialDocumentsLabel', 'מסמכים רשמיים ואישורים')}
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
