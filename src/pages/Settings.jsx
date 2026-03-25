import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './Page.css';
import './Research.css';

const Settings = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="page-container">
      <div className="page-content" style={{ maxWidth: '700px' }}>
        <h1>{t('settingsTitle', 'הגדרות מערכת')}</h1>

        <div
          style={{
            background: '#f9f9f9',
            padding: '24px',
            borderRadius: '8px',
            marginTop: '24px',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '8px', color: '#333' }}>
            {t('language', 'שפה')}
          </h2>
          <p style={{ marginTop: 0, color: '#666' }}>
            {t('languageDescription', 'בחר את שפת הממשק')}
          </p>

          <div style={{ display: 'flex', gap: '16px', marginTop: '18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="language"
                value="he"
                checked={language === 'he'}
                onChange={() => setLanguage('he')}
              />
              <span>{t('hebrew', 'עברית')}</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="language"
                value="en"
                checked={language === 'en'}
                onChange={() => setLanguage('en')}
              />
              <span>{t('english', 'אנגלית')}</span>
            </label>
          </div>

          <p style={{ marginTop: '18px', marginBottom: 0, color: '#6c757d', fontSize: '14px' }}>
            {t('languageSaved', 'השפה תישמר גם בביקור הבא')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
