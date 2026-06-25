import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  PATENT_REQUIRED_DOCUMENT_DEFS,
  toPersistedPatentDocumentsMap,
} from '../../utils/patentRequiredDocuments';

const PatentDocumentsDisplaySection = ({ patentData }) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';

  const filesMap = toPersistedPatentDocumentsMap(patentData?.requiredDocumentsFiles);
  const hasAnyFiles = PATENT_REQUIRED_DOCUMENT_DEFS.some(
    ({ labelKey }) => (filesMap[labelKey] || []).length > 0
  );

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
        {t('patentDocumentsTitle', 'מסמכים')}
      </h2>

      <div style={{ display: 'grid', gap: '16px' }}>
        {PATENT_REQUIRED_DOCUMENT_DEFS.map(({ labelKey, fallback }) => {
          const files = filesMap[labelKey] || [];
          if (files.length === 0) return null;

          return (
            <div
              key={labelKey}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#334155' }}>
                {t(labelKey, fallback)}
              </h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {files.map((fileItem, index) => (
                  <a
                    key={`${labelKey}-${index}-${fileItem.url}`}
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

export default PatentDocumentsDisplaySection;
