import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import './Page.css';
import './Research.css';

const PatentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, userRole, user } = useAuth();
  const [patentData, setPatentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPatent = async () => {
      if (!db) {
        setError('מסד הנתונים לא מאותחל');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const docRef = doc(db, 'patents', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if user has permission to view this patent
          if (userRole === 'RESEARCHER' && data.researcherId !== user?.id) {
            setError('אין הרשאה לצפות בפטנט זה');
            setLoading(false);
            return;
          }

          setPatentData(data);
        } else {
          setError('הפטנט לא נמצא');
        }
      } catch (err) {
        console.error('Error fetching patent:', err);
        setError('שגיאה בטעינת פרטי הפטנט');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPatent();
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
      case 'registered':
        return 'רשום';
      case 'approved':
        return 'אושר';
      case 'in-process':
        return 'בהליך';
      case 'rejected':
        return 'נדחה';
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'registered':
        return 'status-awarded';
      case 'approved':
        return 'status-awarded';
      case 'in-process':
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
    return '/patents';
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
            <p>טוען פרטי פטנט...</p>
          </div>
        )}

        {error && (
          <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && patentData && (
          <div style={{ direction: 'rtl', textAlign: 'right' }}>
            <h1 style={{ marginBottom: '30px', color: '#333' }}>פרטי פטנט</h1>

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
                  <span style={{ fontSize: '16px' }}>
                    {patentData.projectTitle || patentData.title || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    אחוז המוסד:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.institutionPercentage || 'לא צוין'}
                  </span>
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
                  <span style={{ fontSize: '16px' }}>{patentData.submissionPath || 'לא צוין'}</span>
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
                  <span style={{ fontSize: '16px' }}>{patentData.researcherRole || 'לא צוין'}</span>
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
                  <span style={{ fontSize: '16px' }}>{patentData.researcherName || 'לא צוין'}</span>
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
                    className={`status-button ${getStatusClass(patentData.status)}`}
                    style={{ 
                      display: 'inline-block',
                      padding: '5px 15px',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    {getStatusLabel(patentData.status)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    שלב הפטנט:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.patentStage || 'לא צוין'}</span>
                </div>
              </div>
            </div>

            {/* יחידת מסחור */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>יחידת מסחור</h2>
              
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
                    יחידת מסחור:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationUnit || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    איש קשר 1:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationContact1 || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    אימייל 1:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationEmail1 || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    איש קשר 2:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationContact2 || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    אימייל 2:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationEmail2 || 'לא צוין'}
                  </span>
                </div>
              </div>
            </div>

            {/* תאריכים */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>תאריכים</h2>
              
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
                    תאריך הגשת הבקשה:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.submissionDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך בדיקה ראשונית:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.initialReviewDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך בחינה:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.examinationDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך אישור:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.approvalDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך רישום:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.registrationDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך פרסום:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.publicationDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך חידוש:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.renewalDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך תפוגה:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.expiryDate)}
                  </span>
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
                    {formatCurrency(patentData.totalBudget, patentData.currency)}
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
                  <span style={{ fontSize: '16px' }}>{patentData.currency || 'ILS'}</span>
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
                    {formatCurrency(patentData.convertedBudget, 'ILS')}
                  </span>
                </div>
              </div>

              {patentData.stageBudgets && Object.keys(patentData.stageBudgets).length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ marginBottom: '15px', color: '#666' }}>תקציב לפי שלבים:</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px'
                  }}>
                    {Object.entries(patentData.stageBudgets).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '15px',
                        background: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}>
                        <span style={{ fontWeight: 'bold', color: '#666' }}>{key}:</span>
                        <span style={{ marginRight: '10px' }}>
                          {formatCurrency(value, patentData.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* שותפים */}
            {patentData.partners && patentData.partners.length > 0 && (
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
                  {patentData.partners.map((partner, index) => (
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
                      {partner.percentage && (
                        <div>
                          <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>אחוז:</label>
                          <span>{partner.percentage}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* הערות */}
            {patentData.notes && (
              <div style={{ 
                background: '#f9f9f9', 
                padding: '30px', 
                borderRadius: '8px'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>הערות</h2>
                <p style={{ fontSize: '16px', lineHeight: '1.6' }}>{patentData.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatentDetail;
