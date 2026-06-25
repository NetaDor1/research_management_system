import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import FileDropZone from '../../FileDropZone';
import './DocumentChecklistCard.css';

const DocumentChecklistCard = ({
  docName,
  displayLabel,
  files = [],
  onUpload,
  onRemove,
}) => {
  const { t } = useLanguage();
  const hasFiles = files.length > 0;
  const label = displayLabel || docName;

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
    <FileDropZone
      variant="document"
      hasFiles={hasFiles}
      onFiles={onUpload}
    >
      <div className="document-checklist-card__inner">
        <div className="document-checklist-card__title">
          <input
            type="checkbox"
            checked={hasFiles}
            readOnly
            tabIndex={-1}
            className="document-checklist-card__checkbox"
            aria-hidden="true"
          />
          <span className="document-checklist-card__name">{label}</span>
        </div>

        <div className="document-checklist-card__drop-hint" aria-hidden="true">
          <span className="document-checklist-card__drop-icon">📎</span>
          <span className="document-checklist-card__drop-text document-checklist-card__drop-text--idle">
            {hasFiles
              ? t('dropFilesOrClickMore', 'גרור או לחץ להוספת קבצים')
              : t('dropFilesOrClick', 'גרור קבצים לכאן או לחץ להעלאה')}
          </span>
          <span className="document-checklist-card__drop-text document-checklist-card__drop-text--drag">
            {t('dropFilesHere', 'שחרר קבצים כאן')}
          </span>
        </div>

        {hasFiles && (
          <div
            className="document-checklist-card__files"
            onClick={(e) => e.stopPropagation()}
          >
            {files.map((fileItem, fileIndex) => {
              const fileName = getFileName(fileItem);
              const fileUrl = getFileUrl(fileItem);
              return (
                <div key={`${docName}-${fileIndex}-${fileName}`} className="document-checklist-card__file">
                  <a
                    href={fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-checklist-card__file-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📄 {fileName}
                  </a>
                  <button
                    type="button"
                    className="document-checklist-card__remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(fileIndex);
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
    </FileDropZone>
  );
};

export default DocumentChecklistCard;
