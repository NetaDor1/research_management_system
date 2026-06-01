import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Page.css';

const REPORT_TEMPLATES = [
  {
    icon: '🏛️',
    title: 'בקשת זיכיון - מסחור ידע אקדמי',
    desc: 'פורמט בקשת זיכיון לעידוד והאצת מסחור ידע אקדמי לתעשייה',
    file: 'concession-request.docx',
    downloadName: 'בקשת זיכיון - מסחור ידע אקדמי לתעשייה.docx',
  },
  {
    icon: '📅',
    title: 'מסלול לאומי - דוח מדעי שנתי',
    desc: 'פורמט דוח מדעי שנתי עבור מסלול לאומי',
    file: 'leumi-annual-science-report.docx',
    downloadName: 'מסלול לאומי - דוח מדעי שנתי.docx',
  },
  {
    icon: '📋',
    title: 'מסלול לאומי - דוח מדעי מסכם',
    desc: 'פורמט דוח מדעי מסכם עבור מסלול לאומי',
    file: 'leumi-concluding-science-report.docx',
    downloadName: 'מסלול לאומי - דוח מדעי מסכם.docx',
  },
  {
    icon: '🪨',
    title: 'מסלול לאומי - דוח אבני דרך',
    desc: 'פורמט דוח אבני דרך עבור מסלול לאומי',
    file: 'leumi-milestones-report.docx',
    downloadName: 'מסלול לאומי - דוח אבני דרך.docx',
  },
  {
    icon: '🔬',
    title: 'MOST DKFZ - בקשת מחקר (Euro / NIS)',
    desc: 'פורמט בקשת מחקר MOST-DKFZ במטבע אירו ושקל',
    file: 'MOST_DKFZ caspi mechkar Euro NIS.doc',
    downloadName: 'MOST_DKFZ caspi mechkar Euro NIS.doc',
  },
  {
    icon: '📝',
    title: 'MOST - בקשת מחקר',
    desc: 'פורמט בקשת מחקר עבור תכנית MOST',
    file: 'MOST_caspi mechkar.doc',
    downloadName: 'MOST_caspi mechkar.doc',
  },
  {
    icon: '🧪',
    title: 'MOST DKFZ - דוח מדעי',
    desc: 'פורמט דוח מדעי עבור שיתוף פעולה MOST-DKFZ',
    file: 'MOST DKFZ_science_report.docx',
    downloadName: 'MOST DKFZ_science_report.docx',
  },
  {
    icon: '🤝',
    title: 'Bilateral Concluding Scientific Report',
    desc: 'פורמט דוח מדעי מסכם לפרויקטים דו-צדדיים',
    file: 'Bilateral Concluding Scientific Report.docx',
    downloadName: 'Bilateral Concluding Scientific Report.docx',
  },
  {
    icon: '📆',
    title: 'Bilateral Annual Scientific Report',
    desc: 'פורמט דוח מדעי שנתי לפרויקטים דו-צדדיים',
    file: 'Bilateral Annual Scientific Report.docx',
    downloadName: 'Bilateral Annual Scientific Report.docx',
  },
];

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
            : 'פורמטים לדו"חות עבור המחקרים שלך'}
        </p>

        <div className="report-formats">
          {REPORT_TEMPLATES.map((report) => (
            <div className="format-card" key={report.file}>
              <h3>{report.icon} {report.title}</h3>
              <p>{report.desc}</p>
              <a
                href={`${process.env.PUBLIC_URL}/templates/${encodeURIComponent(report.file)}`}
                download={report.downloadName}
                className="format-download-btn"
              >
                {t('downloadTemplate', 'הורד פורמט')}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportFormat;
