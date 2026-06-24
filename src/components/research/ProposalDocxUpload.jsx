import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import { parseResearchProposalFile } from '../../services/parseResearchProposalDocx';
import './ProposalDocxUpload.css';

const TEMPLATE_PATH = '/templates/research-proposal-full.docx';

const ProposalDocxUpload = ({ onParsed, disabled = false }) => {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null);

  const showDialog = (type, message) => {
    setDialog({ type, message });
  };

  const closeDialog = () => {
    setDialog((current) => {
      if (current?.type === 'success') {
        window.setTimeout(() => {
          document.getElementById('abstract')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return null;
    });
  };

  const handleChooseFile = () => {
    if (!disabled && !loading) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.docx') && !lowerName.endsWith('.pdf')) {
      showDialog(
        'error',
        t('proposalDocxInvalidType', 'יש להעלות קובץ Word (.docx) או PDF (.pdf) בלבד')
      );
      return;
    }

    setLoading(true);
    setDialog(null);

    try {
      const { parsed } = await parseResearchProposalFile(file);
      onParsed?.(parsed);
      showDialog('success', '');
    } catch (err) {
      showDialog(
        'error',
        err?.message || t('proposalDocxImportError', 'לא ניתן לסרוק את הקובץ')
      );
    } finally {
      setLoading(false);
    }
  };

  const dialogTitle =
    dialog?.type === 'success'
      ? t('proposalDocxModalSuccessTitle', 'הקובץ נסרק בהצלחה')
      : t('proposalDocxModalErrorTitle', 'שגיאה בסריקת הקובץ');

  const dialogBody =
    dialog?.type === 'success'
      ? t(
          'proposalDocxModalSuccessBody',
          'השדות מולאו אוטומטית. אנא עברו על כל הסעיפים — תקציר, ביבליוגרפיה, תוכנית עבודה ושאר השדות — וודאו שהתוכן הועלה כראוי.'
        )
      : dialog?.message;

  return (
    <>
      <div className="proposal-docx-upload">
      <p className="proposal-docx-upload-title">
        {t('proposalDocxUploadTitle', 'ייבוא טופס מלא (Word / PDF)')}
      </p>
      <p className="proposal-docx-upload-desc">
        {t(
          'proposalDocxUploadDesc',
          'העלו קובץ לפי הפורמט הקבוע — שדות התוכן ימולאו אוטומטית.'
        )}
      </p>

      <div className="proposal-docx-upload-actions">
        <button
          type="button"
          className="proposal-docx-upload-btn"
          onClick={handleChooseFile}
          disabled={disabled || loading}
        >
          {loading
            ? t('proposalDocxScanning', 'סורק את הקובץ...')
            : t('proposalDocxChooseFile', 'בחר קובץ')}
        </button>
        <a className="proposal-docx-template-link" href={TEMPLATE_PATH} download>
          {t('proposalDocxDownloadTemplate', 'הורדת פורמט קבוע')}
        </a>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
          className="proposal-docx-hidden-input"
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      </div>

      {dialog &&
        createPortal(
          <div
            className="proposal-docx-modal-overlay"
            onClick={closeDialog}
            role="presentation"
          >
            <div
              className="proposal-docx-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="proposal-docx-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`proposal-docx-modal-header proposal-docx-modal-header--${dialog.type}`}>
                <h3 id="proposal-docx-modal-title">{dialogTitle}</h3>
              </div>
              <div className="proposal-docx-modal-body">
                <p>{dialogBody}</p>
              </div>
              <div className="proposal-docx-modal-footer">
                <button type="button" className="proposal-docx-modal-btn" onClick={closeDialog}>
                  {t('proposalDocxModalOk', 'הבנתי')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ProposalDocxUpload;
