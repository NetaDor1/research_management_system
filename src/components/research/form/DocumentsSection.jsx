import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const DocumentsSection = ({ 
  formData, 
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
        <label>{t('documentsChecklistLabel', "רשימת צ'קליסט של מסמכים להגשה מטעם המוסד")}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {requiredDocuments.map((docName) => {
            const filesForDoc = formData.requiredDocumentsFiles?.[docName] || [];
            const hasFiles = filesForDoc.length > 0;
            return (
              <div
                key={docName}
                style={{
                  border: `1px solid ${hasFiles ? '#a7f3d0' : '#dbe2ea'}`,
                  borderRadius: '8px',
                  background: hasFiles ? '#f0fdf4' : '#fff',
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={hasFiles}
                      readOnly
                      style={{ width: '16px', height: '16px', flexShrink: 0, accentColor: '#667eea' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{docName}</span>
                  </div>
                  <label
                    style={{
                      cursor: 'pointer',
                      background: '#667eea',
                      color: 'white',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
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

                {hasFiles && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {filesForDoc.map((fileItem, fileIndex) => {
                      const fileName = getFileName(fileItem);
                      const fileUrl = getFileUrl(fileItem);
                      return (
                        <div
                          key={`${docName}-${fileIndex}-${fileName}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            background: '#fff',
                            border: '1px solid #d1fae5',
                            borderRadius: '6px',
                            padding: '6px 10px',
                          }}
                        >
                          <a
                            href={fileUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ flex: 1, wordBreak: 'break-word', color: '#667eea', textDecoration: 'none', fontSize: '13px' }}
                          >
                            📄 {fileName}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveRequiredDocumentFile(docName, fileIndex)}
                            style={{
                              border: '1px solid #cbd5e1',
                              background: 'white',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            {t('remove', 'הסר')}
                          </button>
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
    </div>
  );
};

export default DocumentsSection;
