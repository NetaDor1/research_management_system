import React, { useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { parseResearchProposalDocxFile } from '../../services/parseResearchProposalDocx';
import './ProposalDocxUpload.css';

const TEMPLATE_PATH = '/templates/research-proposal-full.docx';

const ProposalDocxUpload = ({ onParsed, disabled = false }) => {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChooseFile = () => {
    if (!disabled && !loading) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError(t('proposalDocxInvalidType', 'יש להעלות קובץ Word בפורמט .docx בלבד'));
      setSuccess('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { parsed } = await parseResearchProposalDocxFile(file);
      onParsed?.(parsed);
      setSuccess(t('proposalDocxImportSuccess', 'הטופס נסרק בהצלחה והשדות מולאו. בדקו את התוכן ומלאו את הפרטים הטכניים.'));
      window.setTimeout(() => {
        document.getElementById('abstract')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err?.message || t('proposalDocxImportError', 'לא ניתן לסרוק את הקובץ'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="proposal-docx-upload">
      <div className="proposal-docx-upload-header">
        <h2>{t('proposalDocxUploadTitle', 'העלאת טופס Word מלא')}</h2>
        <p className="proposal-docx-upload-desc">
          {t(
            'proposalDocxUploadDesc',
            'במקום למלא ידנית את תוכן ההצעה, העלו קובץ Word לפי הפורמט הקבוע. המערכת תמלא את שדות התוכן; פרטים טכניים (קרן, תקציב, תאריכים וכו׳) יש למלא באתר.'
          )}
        </p>
      </div>

      <div className="proposal-docx-upload-actions">
        <button
          type="button"
          className="proposal-docx-upload-btn"
          onClick={handleChooseFile}
          disabled={disabled || loading}
        >
          {loading
            ? t('proposalDocxScanning', 'סורק את הקובץ...')
            : t('proposalDocxChooseFile', 'בחר קובץ Word (.docx)')}
        </button>
        <a className="proposal-docx-template-link" href={TEMPLATE_PATH} download>
          {t('proposalDocxDownloadTemplate', 'הורדת פורמט קבוע')}
        </a>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="proposal-docx-hidden-input"
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {error && <p className="proposal-docx-message proposal-docx-error">{error}</p>}
      {success && <p className="proposal-docx-message proposal-docx-success">{success}</p>}
    </div>
  );
};

export default ProposalDocxUpload;
