import React, { useRef, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './FileDropZone.css';

const FileDropZone = ({
  onFiles,
  multiple = true,
  disabled = false,
  accept,
  variant = 'default',
  label,
  children,
  hasFiles = false,
}) => {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const processFiles = useCallback((fileList) => {
    if (!fileList?.length || disabled) return;
    const files = Array.from(fileList);
    onFiles(multiple ? files : [files[0]]);
  }, [disabled, multiple, onFiles]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const openPicker = (e) => {
    e.stopPropagation();
    if (!disabled) inputRef.current?.click();
  };

  const displayLabel = label ?? (
    isDragging
      ? t('dropFilesHere', 'שחרר קבצים כאן')
      : t('dropFilesOrClick', 'גרור קבצים לכאן או לחץ להעלאה')
  );

  const classNames = [
    'file-drop-zone',
    `file-drop-zone--${variant}`,
    isDragging ? 'file-drop-zone--dragging' : '',
    disabled ? 'file-drop-zone--disabled' : '',
    variant === 'document' && hasFiles ? 'file-drop-zone--has-files' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={openPicker}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        className="file-drop-zone__input"
        onChange={handleChange}
        tabIndex={-1}
        aria-hidden="true"
      />
      {variant === 'document' ? (
        children
      ) : (
        <div className="file-drop-zone__content">
          {variant === 'default' ? (
            <>
              <span className="file-drop-zone__icon" aria-hidden="true">📁</span>
              <span className="file-drop-zone__primary">{displayLabel}</span>
            </>
          ) : (
            <>
              <span className="file-drop-zone__icon" aria-hidden="true">📎</span>
              <span>{displayLabel}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
