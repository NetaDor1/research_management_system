import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../services/firebase';
import './Page.css';
import './Research.css';
import { exportPrintableHtmlToPdf, escapeHtml } from '../utils/exportPdf';
import { navigateBackOrFallback } from '../utils/navigation';

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, userRole, user } = useAuth();
  const { t, language } = useLanguage();
  const [articleData, setArticleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkedResearch, setLinkedResearch] = useState(null);
  const [linkedResearchLoading, setLinkedResearchLoading] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!db) {
        setError('מסד הנתונים לא מאותחל');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const docRef = doc(db, 'articles', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if user has permission to view this article
          if (userRole === 'RESEARCHER' && data.researcherId !== user?.id) {
            setError('אין הרשאה לצפות במאמר זה');
            setLoading(false);
            return;
          }

          setArticleData(data);
        } else {
          setError('המאמר לא נמצא');
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('שגיאה בטעינת פרטי המאמר');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id, userRole, user?.id]);

  useEffect(() => {
    if (!db) return;

    const researchId = articleData?.researchProposalId;
    if (!researchId) {
      setLinkedResearch(null);
      return;
    }

    let isActive = true;
    setLinkedResearchLoading(true);

    const fetchLinkedResearch = async () => {
      try {
        const researchSnap = await getDoc(doc(db, 'researchProposals', researchId));
        if (!isActive) return;
        if (researchSnap.exists()) {
          const data = researchSnap.data();
          setLinkedResearch({
            id: researchId,
            title: data.projectTitle || data.title || 'ללא כותרת'
          });
        } else {
          setLinkedResearch(null);
        }
      } catch (err) {
        console.error('Error fetching linked research:', err);
        if (isActive) {
          setLinkedResearch(null);
        }
      } finally {
        if (isActive) {
          setLinkedResearchLoading(false);
        }
      }
    };

    fetchLinkedResearch();
    return () => {
      isActive = false;
    };
  }, [db, articleData?.researchProposalId]);

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

  const getStatusLabel = (status) => {
    switch (status) {
      case 'published':
        return 'פורסם';
      case 'in-review':
        return 'בביקורת';
      case 'rejected':
        return 'נדחה';
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'published':
        return 'status-awarded';
      case 'in-review':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const getPublicationTypeLabel = (type) => {
    switch (type) {
      case 'journal':
        return 'כתב עת';
      case 'conference':
        return 'כנס';
      default:
        return type || 'לא צוין';
    }
  };

  const getBackPath = () => (userRole === 'RESEARCHER' ? '/' : '/articles');

  const formatDateForLocale = (value) => {
    if (!value) return t('notSpecified', 'לא צוין');
    try {
      if (value && typeof value.toDate === 'function') {
        return value.toDate().toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL');
      }
      if (value && value.seconds) {
        return new Date(value.seconds * 1000).toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL');
      }
      if (typeof value === 'string') {
        return new Date(value).toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL');
      }
      return String(value);
    } catch {
      return String(value);
    }
  };

  const handleExportPDF = () => {
    if (!articleData) return;

    const titleValue = articleData.title || t('notSpecified', 'לא צוין');
    const pdfTitle = `${t('articleDetailsTitle', 'פרטי מאמר')} - ${titleValue}`;
    const dir = language === 'en' ? 'ltr' : 'rtl';
    const lang = language === 'en' ? 'en' : 'he';

    const statusLabel =
      articleData.status === 'published'
        ? t('published', 'פורסם')
        : articleData.status === 'in-review'
          ? t('inReview', 'בביקורת')
          : articleData.status === 'rejected'
            ? t('rejected', 'נדחה')
            : articleData.status || t('notSpecified', 'לא צוין');

    const publicationTypeLabel =
      articleData.publicationType === 'journal'
        ? t('journal', 'כתב עת')
        : articleData.publicationType === 'conference'
          ? t('conference', 'כנס')
          : articleData.publicationType || t('notSpecified', 'לא צוין');

    const htmlBody = `
      <h1>${escapeHtml(pdfTitle)}</h1>

      <div class="section">
        <h2>${escapeHtml(t('generalDetails', 'פרטים כלליים'))}</h2>
        <div class="grid">
          <div class="kv"><div class="k">${escapeHtml(t('articleTitleLabel', 'כותרת המאמר'))}</div><div class="v">${escapeHtml(titleValue)}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('publishedJournalName', 'שם העיתון בו פורסם'))}</div><div class="v">${escapeHtml(articleData.journalName || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('journalRankingLabel', 'דירוג העיתון'))}</div><div class="v">${escapeHtml(articleData.journalRanking || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('publicationYearLabel', 'שנת הפרסום'))}</div><div class="v">${escapeHtml(articleData.publicationYear || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('publicationDateLabel', 'תאריך פרסום'))}</div><div class="v">${escapeHtml(formatDateForLocale(articleData.publicationDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('publicationTypeLabel', 'סוג פרסום'))}</div><div class="v">${escapeHtml(publicationTypeLabel)}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('researcher', 'חוקר'))}</div><div class="v">${escapeHtml(articleData.researcherName || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('status', 'סטטוס'))}</div><div class="v">${escapeHtml(statusLabel)}</div></div>
        </div>
      </div>

      ${articleData.articleLink ? `
        <div class="section">
          <h2>${escapeHtml(t('articleLinkLabel', 'קישור למאמר'))}</h2>
          <div class="kv"><div class="v"><a href="${escapeHtml(articleData.articleLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(articleData.articleLink)}</a></div></div>
        </div>
      ` : ''}

      ${articleData.notes ? `
        <div class="section">
          <h2>${escapeHtml(t('notesFreeText', 'הערות'))}</h2>
          <div class="kv"><div class="v">${escapeHtml(articleData.notes)}</div></div>
        </div>
      ` : ''}

      <div class="muted" style="margin-top: 20px; font-size: 12px;">
        ${escapeHtml(language === 'en' ? `Generated on ${new Date().toLocaleString('en-US')}` : `נוצר ב-${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL')}`)}
      </div>
    `;

    exportPrintableHtmlToPdf({ title: pdfTitle, htmlBody, dir, lang });
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <button 
          onClick={() => navigateBackOrFallback(navigate, getBackPath())}
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
          ← {t('back', 'חזרה')}
        </button>

        {loading && (
          <div className="no-results">
            <p>טוען פרטי מאמר...</p>
          </div>
        )}

        {error && (
          <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && articleData && (
          <div style={{ textAlign: language === 'en' ? 'left' : 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, color: '#333' }}>פרטי מאמר</h1>
              <button
                type="button"
                onClick={handleExportPDF}
                style={{
                  padding: '10px 20px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {t('exportPdf', 'ייצוא ל-PDF')}
              </button>
            </div>

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
                    כותרת המאמר:
                  </label>
                  <span style={{ fontSize: '16px' }}>{articleData.title || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    שם העיתון:
                  </label>
                  <span style={{ fontSize: '16px' }}>{articleData.journalName || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    דירוג העיתון:
                  </label>
                  <span style={{ fontSize: '16px' }}>{articleData.journalRanking || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    שנת פרסום:
                  </label>
                  <span style={{ fontSize: '16px' }}>{articleData.publicationYear || 'לא צוין'}</span>
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
                  <span style={{ fontSize: '16px' }}>{formatDate(articleData.publicationDate)}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    סוג פרסום:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {getPublicationTypeLabel(articleData.publicationType)}
                  </span>
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
                  <span style={{ fontSize: '16px' }}>{articleData.researcherName || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    מחקר מקושר:
                  </label>
                  {articleData.researchProposalId ? (
                    linkedResearchLoading ? (
                      <span style={{ fontSize: '16px' }}>טוען...</span>
                    ) : linkedResearch ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/research/${linkedResearch.id}`)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          color: '#667eea',
                          cursor: 'pointer',
                          fontSize: '16px',
                          textDecoration: 'underline'
                        }}
                      >
                        {linkedResearch.title}
                      </button>
                    ) : (
                      <span style={{ fontSize: '16px' }}>לא נמצא</span>
                    )
                  ) : (
                    <span style={{ fontSize: '16px' }}>לא מקושר</span>
                  )}
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
                    className={`status-button ${getStatusClass(articleData.status)}`}
                    style={{ 
                      display: 'inline-block',
                      padding: '5px 15px',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    {getStatusLabel(articleData.status)}
                  </span>
                </div>
              </div>

              {articleData.articleLink && (
                <div style={{ marginTop: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '10px',
                    color: '#666'
                  }}>
                    קישור למאמר:
                  </label>
                  <a 
                    href={articleData.articleLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: '#667eea',
                      textDecoration: 'none',
                      fontSize: '16px',
                      wordBreak: 'break-all'
                    }}
                    onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                  >
                    {articleData.articleLink}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleDetail;
