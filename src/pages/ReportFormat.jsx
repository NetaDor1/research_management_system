import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Page.css';

const ReportFormat = () => {
  const { isAdmin, user } = useAuth();

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>
          {isAdmin() ? 'פורמט דו"חות - ניהול' : 'פורמט דו"חות'}
        </h1>
        <p className="welcome-text">
          {isAdmin() 
            ? 'ניהול פורמטים לדו"חות עבור כל החוקרים במכללה'
            : `פורמטים לדו"חות עבור המחקרים, המאמרים והפטנטים שלך`}
        </p>

        <div className="report-formats">
          <div className="format-card">
            <h3>📊 דוח מחקרים</h3>
            <p>פורמט לדוח מחקרים כולל פרטי המחקר, סטטוס, תאריכים ותקציב</p>
            <button className="format-download-btn">הורד פורמט</button>
          </div>

          <div className="format-card">
            <h3>📄 דוח מאמרים</h3>
            <p>פורמט לדוח מאמרים כולל פרטי הפרסום, כתב עת/כנס ותאריכים</p>
            <button className="format-download-btn">הורד פורמט</button>
          </div>

          <div className="format-card">
            <h3>📜 דוח פטנטים</h3>
            <p>פורמט לדוח פטנטים כולל פרטי הרישום, סטטוס ותאריכים</p>
            <button className="format-download-btn">הורד פורמט</button>
          </div>

          {isAdmin() && (
            <div className="format-card admin-only">
              <h3>📋 דוח כללי - רשות המחקר</h3>
              <p>דוח מקיף של כל המחקרים, המאמרים והפטנטים במכללה</p>
              <button className="format-download-btn">הורד פורמט</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportFormat;

