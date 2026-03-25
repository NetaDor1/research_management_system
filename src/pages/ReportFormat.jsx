import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Page.css';

const ReportFormat = () => {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>
          {isAdmin() ? t('reportFormatsAdmin', 'פורמט דו"חות - ניהול') : t('reportFormats', 'פורמט דו"חות')}
        </h1>
        <p className="welcome-text">
          {isAdmin() 
            ? 'ניהול פורמטים לדו"חות עבור כל החוקרים במכללה'
            : `פורמטים לדו"חות עבור המחקרים, המאמרים והפטנטים שלך`}
        </p>

        <div className="report-formats">
          <div className="format-card">
            <h3>📊 {t('reportResearchTitle', 'דוח מחקרים')}</h3>
            <p>{t('reportResearchDesc', 'פורמט לדוח מחקרים כולל פרטי המחקר, סטטוס, תאריכים ותקציב')}</p>
            <button className="format-download-btn">{t('downloadTemplate', 'הורד פורמט')}</button>
          </div>

          <div className="format-card">
            <h3>📄 {t('reportArticlesTitle', 'דוח מאמרים')}</h3>
            <p>{t('reportArticlesDesc', 'פורמט לדוח מאמרים כולל פרטי הפרסום, כתב עת/כנס ותאריכים')}</p>
            <button className="format-download-btn">{t('downloadTemplate', 'הורד פורמט')}</button>
          </div>

          <div className="format-card">
            <h3>📜 {t('reportPatentsTitle', 'דוח פטנטים')}</h3>
            <p>{t('reportPatentsDesc', 'פורמט לדוח פטנטים כולל פרטי הרישום, סטטוס ותאריכים')}</p>
            <button className="format-download-btn">{t('downloadTemplate', 'הורד פורמט')}</button>
          </div>

          {isAdmin() && (
            <div className="format-card admin-only">
              <h3>📋 {t('reportGeneralTitle', 'דוח כללי - רשות המחקר')}</h3>
              <p>{t('reportGeneralDesc', 'דוח מקיף של כל המחקרים, המאמרים והפטנטים במכללה')}</p>
              <button className="format-download-btn">{t('downloadTemplate', 'הורד פורמט')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportFormat;

