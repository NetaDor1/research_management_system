import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  REQUIRED_DOCUMENT_KEYS,
  REQUIRED_DOCUMENT_FALLBACKS,
  toPersistedRequiredDocumentsMap,
} from '../../utils/requiredDocuments';

const DocumentsDisplaySection = ({ researchData }) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';

  const filesMap = toPersistedRequiredDocumentsMap(researchData?.requiredDocumentsFiles);
  const hasAnyFiles = REQUIRED_DOCUMENT_KEYS.some((key) => (filesMap[key] || []).length > 0);

  if (!hasAnyFiles) return null;

  return (
    <div
      style={{
        background: '#f9f9f9',
        padding: '30px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign,
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#667eea' }}>
        {t('documentsTitle', 'מסמכים')}
      </h2>

      <div style={{ display: 'grid', gap: '16px' }}>
        {REQUIRED_DOCUMENT_KEYS.map((docKey) => {
          const files = filesMap[docKey] || [];
          if (files.length === 0) return null;

          const label = t(docKey, REQUIRED_DOCUMENT_FALLBACKS[docKey]);

          return (
            <div
              key={docKey}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#334155' }}>
                {label}
              </h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {files.map((fileItem, index) => (
                  <a
                    key={`${docKey}-${index}-${fileItem.url}`}
                    href={fileItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#667eea',
                      textDecoration: 'none',
                      fontSize: '15px',
                      wordBreak: 'break-word',
                    }}
                    onMouseOver={(e) => { e.target.style.textDecoration = 'underline'; }}
                    onMouseOut={(e) => { e.target.style.textDecoration = 'none'; }}
                  >
                    📄 {fileItem.name || t('downloadFile', 'הורדה')}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentsDisplaySection;
