import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import './Page.css';
import './Research.css';

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

const ResearchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, userRole, user } = useAuth();
  const [researchData, setResearchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResearch = async () => {
      if (!db) {
        setError('מסד הנתונים לא מאותחל');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const docRef = doc(db, 'researchProposals', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if user has permission to view this research
          if (userRole === 'RESEARCHER' && data.researcherId !== user?.id) {
            setError('אין הרשאה לצפות במחקר זה');
            setLoading(false);
            return;
          }

          setResearchData(data);
        } else {
          setError('המחקר לא נמצא');
        }
      } catch (err) {
        console.error('Error fetching research:', err);
        setError('שגיאה בטעינת פרטי המחקר');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResearch();
    }
  }, [id, userRole, user?.id]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'לא צוין';
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('he-IL');
      }
      if (timestamp && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('he-IL');
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString('he-IL');
      }
      return String(timestamp);
    } catch (e) {
      return String(timestamp);
    }
  };

  const formatCurrency = (amount, currency = 'ILS') => {
    if (!amount) return 'לא צוין';
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
    return `${currencySymbol} ${Number(amount).toLocaleString('he-IL')}`;
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

  const getBackPath = () => {
    if (userRole === 'RESEARCHER') {
      return '/';
    }
    return '/research';
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <button 
          onClick={() => navigate(getBackPath())}
          style={{
            marginBottom: '20px',
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ← חזרה
        </button>

        {loading && (
          <div className="no-results">
            <p>טוען פרטי מחקר...</p>
          </div>
        )}

        {error && (
          <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && researchData && (
          <div style={{ direction: 'rtl', textAlign: 'right' }}>
            <h1 style={{ marginBottom: '30px', color: '#333' }}>פרטי מחקר</h1>

            {/* פרטים כלליים */}
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

            {/* תקופת המחקר */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>תקופת המחקר</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך התחלה:
                  </label>
                  <span style={{ fontSize: '16px' }}>{formatDate(researchData.researchStartDate)}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך סיום:
                  </label>
                  <span style={{ fontSize: '16px' }}>{formatDate(researchData.researchEndDate)}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    משך המחקר (שנים):
                  </label>
                  <span style={{ fontSize: '16px' }}>{researchData.researchDurationYears || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    שנה אקדמית:
                  </label>
                  <span style={{ fontSize: '16px' }}>{researchData.academicYear || 'לא צוין'}</span>
                </div>
              </div>
            </div>

            {/* תקציב */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>תקציב</h2>
              
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
                    תקציב כולל:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatCurrency(researchData.totalBudget, researchData.currency)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    מטבע:
                  </label>
                  <span style={{ fontSize: '16px' }}>{researchData.currency || 'ILS'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תקציב מומר:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatCurrency(researchData.convertedBudget, 'ILS')}
                  </span>
                </div>
              </div>

              {researchData.budgetComponents && Object.keys(researchData.budgetComponents).length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ marginBottom: '15px', color: '#666' }}>רכיבי תקציב:</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px'
                  }}>
                    {Object.entries(researchData.budgetComponents).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '15px',
                        background: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}>
                        <span style={{ fontWeight: 'bold', color: '#666' }}>{key}:</span>
                        <span style={{ marginRight: '10px' }}>
                          {formatCurrency(value, researchData.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* שותפים */}
            {researchData.partners && researchData.partners.length > 0 && (
              <div style={{ 
                background: '#f9f9f9', 
                padding: '30px', 
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>שותפים</h2>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {researchData.partners.map((partner, index) => (
                    <div key={index} style={{
                      padding: '20px',
                      background: '#fff',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>שם:</label>
                        <span>{partner.name || 'לא צוין'}</span>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>אימייל:</label>
                        <span>{partner.email || 'לא צוין'}</span>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>מוסד:</label>
                        <span>{partner.institution || 'לא צוין'}</span>
                      </div>
                      {partner.country && (
                        <div>
                          <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>מדינה:</label>
                          <span>{partner.country}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* מידע נוסף */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>מידע נוסף</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך תגובה צפוי:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(researchData.expectedResponseDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* הערות */}
            {researchData.notes && (
              <div style={{ 
                background: '#f9f9f9', 
                padding: '30px', 
                borderRadius: '8px'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>הערות</h2>
                <p style={{ fontSize: '16px', lineHeight: '1.6' }}>{researchData.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchDetail;
