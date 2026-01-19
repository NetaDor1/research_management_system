import React from 'react';

// Mapping of fund names to their URLs
const fundLinks = {
  'הקרן הלאומית למדע ISF - Israeli Science Foundation': 'https://www.isf.org.il/#/',
  'הקרן הדו-לאומית למדע BSF - Binational Science Foundation': 'https://www.bsf.org.il/',
  'הקרן הגרמנית-ישראלית למחקר ופיתוח GIF - German-Israeli Foundation': 'https://www.gif.org.il/',
  'האיחוד האירופי Horizon': 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/horizon-dashboard',
  'משרד החדשנות, המדע והטכנולוגיה MOST': 'https://www.gov.il/he/departments/ministry_of_science_and_technology/govil-landing-page',
  'משרד הבריאות MOH': 'https://www.gov.il/he/departments/units/office-of-the-chief-scientist/govil-landing-page',
  'המכון הלאומי לבריאות (ארה"ב) - NIH National Institute of Health': 'https://grants.nih.gov/',
  'הקרן לחקר הסרטן ICRF': 'https://www.icrfonline.org/',
  'הקרן הדו-לאומית למחקר ופיתוח חקלאי BARD': 'https://www.bard-isus.org/',
  'שיתוף פעולה גרמניה-ישראל DIP': 'https://www.internationales-buero.de/en/index.php',
  'הקרן הגרמנית למחקר DFG': 'https://www.dfg.de/en/about-us',
  'HFSP - Human Frontiers Science Project': 'https://www.hfsp.org/',
  'רשות המים - המדען הראשי': 'https://www.gov.il/he/pages/national_water_system',
  'רשות האנרגיה והתשתיות - המדען הראשי': 'https://www.gov.il/he/departments/ministry_of_energy/govil-landing-page',
  'המשרד לאיכות הסביבה - המדען הראשי': 'https://www.gov.il/he/departments/dynamiccollectors/research_sviva',
  'משרד החקלאות וההתיישבות הכפרית / מכון וולקני': 'https://www.agri.gov.il/he/home/default.aspx',
  'האגודה למלחמה בסרטן': 'https://www.cancer.org.il/',
  'אלו"ט': 'https://alut.org.il/',
  'קרן "שלם"': 'https://www.kshalem.org.il/',
  'Volfswagen Stiftung': 'https://www.volkswagenstiftung.de/en',
  'Spencer Foundation for Research in Education': 'https://www.spencer.org/',
  'קרן קיימת לישראל קק"ל': 'https://www.kkl.org.il/',
  'מו"פ מדבר יהודה וים המלח': 'https://www.adssc.org/',
  'המרכז למחקרי סביבה וקיימות': 'https://www.openu.ac.il/env-center/pages/default.aspx',
  'קרן פזי': 'https://www.pazyfoundation.org.il/',
  'מכון אלי הורביץ לניהול אסטרטגי': 'https://www.hurvitz-institute.tau.ac.il/',
  'מרכז לדאטה ובינה מלאכותית - אונ\' תל אביב': 'https://datascience.tau.ac.il/'
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'awarded':
      return 'זכייה';
    case 'pending':
      return 'המתנה';
    case 'rejected':
      return 'לא אושר';
    default:
      return status;
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case 'awarded':
      return 'status-awarded';
    case 'pending':
      return 'status-pending';
    case 'rejected':
      return 'status-rejected';
    default:
      return '';
  }
};

const ResearchInfoSection = ({ researchData }) => {
  if (!researchData) return null;

  return (
    <div style={{ 
      background: '#f9f9f9', 
      padding: '30px', 
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h2 style={{ marginBottom: '20px', color: '#667eea' }}>פרטים כלליים</h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            כותרת הפרויקט:
          </label>
          <span style={{ fontSize: '16px' }}>{researchData.projectTitle || 'לא צוין'}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            שם הקרן:
          </label>
          <div style={{ fontSize: '16px' }}>
            <span>{researchData.fundName || 'לא צוין'}</span>
            {researchData.fundName && fundLinks[researchData.fundName] && (
              <div style={{ marginTop: '8px' }}>
                <a 
                  href={fundLinks[researchData.fundName]} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: '#667eea',
                    textDecoration: 'none',
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                  onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                >
                  🔗 קישור לאתר הקרן
                </a>
              </div>
            )}
          </div>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            סוג הקרן:
          </label>
          <span style={{ fontSize: '16px' }}>{researchData.fundType || 'לא צוין'}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            מסלול הגשה:
          </label>
          <span style={{ fontSize: '16px' }}>{researchData.submissionPath || 'לא צוין'}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            סוג הגשה:
          </label>
          <span style={{ fontSize: '16px' }}>{researchData.submissionType || 'לא צוין'}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            תפקיד החוקר:
          </label>
          <span style={{ fontSize: '16px' }}>{researchData.researcherRole || 'לא צוין'}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            שלב ההצעה:
          </label>
          <span style={{ fontSize: '16px' }}>{researchData.proposalStage || 'לא צוין'}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            חוקר:
          </label>
          <span style={{ fontSize: '16px' }}>{researchData.researcherName || 'לא צוין'}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            סטטוס:
          </label>
          <span 
            className={`status-button ${getStatusClass(researchData.status)}`}
            style={{ 
              display: 'inline-block',
              padding: '5px 15px',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            {getStatusLabel(researchData.status)}
          </span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            יש פטנט:
          </label>
          <span style={{ fontSize: '16px' }}>{researchData.hasPatent ? 'כן' : 'לא'}</span>
        </div>
      </div>
    </div>
  );
};

export default ResearchInfoSection;
