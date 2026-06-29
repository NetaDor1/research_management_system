import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../services/firebase';
import { createNotification } from '../services/notifications';
import './Page.css';
import './Research.css';
import { exportPrintableHtmlToPdf, escapeHtml } from '../utils/exportPdf';
import { navigateBackOrFallback } from '../utils/navigation';
import { canResearcherEditArticle, isDraft } from '../utils/submissionStatus';

const normalizeArticleStatus = (status) => {
  if (status === 'published') return 'approved';
  if (status === 'in-review') return 'pending';
  if (status === 'submitted' || status === 'pending' || status === 'approved' || status === 'rejected') {
    return status;
  }
  return 'submitted';
};

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, userRole, user } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const locale = language === 'en' ? 'en-US' : 'he-IL';
  const notSpecified = t('notSpecified', 'לא צוין');
  const [articleData, setArticleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkedResearch, setLinkedResearch] = useState(null);
  const [linkedResearchLoading, setLinkedResearchLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!db) {
        setError(t('dbNotInitialized', 'מסד הנתונים לא מאותחל'));
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
            setError(t('noPermissionViewArticle', 'אין הרשאה לצפות במאמר זה'));
            setLoading(false);
            return;
          }

          if (userRole === 'ADMIN' && isDraft(data)) {
            setError(t('draftNotVisibleToAdmin', 'טיוטה זו אינה זמינה לרשות המחקר עד להגשה'));
            setLoading(false);
            return;
          }

          setArticleData({ ...data, status: normalizeArticleStatus(data.status) });
        } else {
          setError(t('articleNotFound', 'המאמר לא נמצא'));
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        setError(t('loadArticleError', 'שגיאה בטעינת פרטי המאמר'));
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
            title: data.projectTitle || data.title || t('noTitle', 'ללא כותרת')
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
    if (!timestamp) return notSpecified;
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString(locale);
      }
      if (timestamp && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString(locale);
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString(locale);
      }
      return String(timestamp);
    } catch (e) {
      return String(timestamp);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'submitted':
        return t('submittedStatus', 'הוגש');
      case 'pending':
        return t('pending', 'בהמתנה');
      case 'approved':
        return t('approved', 'אושר');
      case 'rejected':
        return t('rejected', 'נדחה');
      default:
        return status || notSpecified;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved':
        return 'status-awarded';
      case 'submitted':
      case 'pending':
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
        return t('journal', 'כתב עת');
      case 'conference':
        return t('conference', 'כנס');
      default:
        return type || notSpecified;
    }
  };

  const getBackPath = () => (userRole === 'RESEARCHER' ? '/' : '/articles');

  const canChangeArticleStatus = () =>
    Boolean(
      articleData &&
      (isAdmin() || (userRole === 'RESEARCHER' && articleData.researcherId === user?.id))
    );

  const handleArticleDecision = async (newStatus) => {
    if (!canChangeArticleStatus() || !id || statusSaving) return;
    setStatusSaving(true);
    try {
      await updateDoc(doc(db, 'articles', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      const title = articleData.title || '';
      if (isAdmin() && articleData.researcherId) {
        const notifTitle = newStatus === 'approved' ? 'המאמר אושר' : newStatus === 'rejected' ? 'המאמר נדחה' : 'המאמר בהמתנה';
        const notifMsg = newStatus === 'approved'
          ? `המאמר "${title}" אושר.`
          : newStatus === 'rejected'
            ? `המאמר "${title}" נדחה.`
            : `המאמר "${title}" הועבר לסטטוס בהמתנה.`;

        await createNotification({
          userId: articleData.researcherId,
          title: notifTitle,
          message: notifMsg,
          type: 'article_status_update',
          entityType: 'article',
          entityId: id,
          link: `/articles/${id}`,
          eventKey: `article_status_${newStatus}:${id}:${Date.now()}`,
        });
      } else if (!isAdmin()) {
        const statusLabel = newStatus === 'approved' ? 'אושר' : newStatus === 'rejected' ? 'נדחה' : 'בהמתנה';
        await createNotification({
          userId: 'ADMIN',
          targetRole: 'ADMIN',
          title: 'עדכון סטטוס מאמר',
          message: `${user?.name || 'חוקר'} עדכן/ה את סטטוס המאמר "${title}" ל-${statusLabel}.`,
          type: 'article_status_update',
          entityType: 'article',
          entityId: id,
          link: `/articles/${id}`,
          eventKey: `article_status_${newStatus}:${id}:${Date.now()}`,
        });
      }

      setArticleData((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating article status:', err);
      alert(t('saveArticleError', 'שגיאה בשמירת המאמר'));
    } finally {
      setStatusSaving(false);
    }
  };

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

    const statusLabel = getStatusLabel(articleData.status);

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

      ${articleData.articleFile?.url ? `
        <div class="section">
          <h2>${escapeHtml(t('articleFileLabel', 'קובץ המאמר (PDF / Word)'))}</h2>
          <div class="kv"><div class="v"><a href="${escapeHtml(articleData.articleFile.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(articleData.articleFile.name || t('downloadArticleFile', 'הורד קובץ המאמר'))}</a></div></div>
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
            <p>{t('loadingArticleDetails', 'טוען פרטי מאמר...')}</p>
          </div>
        )}

        {error && (
          <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && articleData && (
          <div style={{ textAlign }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, color: '#333' }}>{t('articleDetailsTitle', 'פרטי מאמר')}</h1>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                {(userRole === 'ADMIN' || canResearcherEditArticle(articleData)) && (
                  <button
                    type="button"
                    onClick={() => navigate(`/articles/new?edit=${id}`)}
                    style={{
                      padding: '10px 20px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    ✏️ {t('editArticle', 'ערוך מאמר')}
                  </button>
                )}
              </div>
            </div>

            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>{t('generalDetails', 'פרטים כלליים')}</h2>
              
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
                    {t('articleTitleShort', 'כותרת המאמר')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>{articleData.title || notSpecified}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('journalNameShort', 'שם העיתון')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>{articleData.journalName || notSpecified}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('journalRankingShort', 'דירוג העיתון')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>{articleData.journalRanking || notSpecified}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('publicationYearLabel', 'שנת הפרסום')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>{articleData.publicationYear || notSpecified}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('publicationTypeLabel', 'סוג פרסום')}:
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
                    {t('researcher', 'חוקר')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>{articleData.researcherName || notSpecified}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('linkedResearch', 'מחקר מקושר')}:
                  </label>
                  {articleData.researchProposalId ? (
                    linkedResearchLoading ? (
                      <span style={{ fontSize: '16px' }}>{t('loadingShort', 'טוען...')}</span>
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
                      <span style={{ fontSize: '16px' }}>{t('linkedNotFound', 'לא נמצא')}</span>
                    )
                  ) : (
                    <span style={{ fontSize: '16px' }}>{t('notLinked', 'לא מקושר')}</span>
                  )}
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('status', 'סטטוס')}:
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
                  {canChangeArticleStatus() && articleData.status === 'submitted' && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleArticleDecision('pending')}
                        disabled={statusSaving}
                        style={{
                          padding: '4px 14px',
                          background: 'transparent',
                          color: statusSaving ? '#aaa' : '#8a6d3b',
                          border: `1px solid ${statusSaving ? '#aaa' : '#8a6d3b'}`,
                          borderRadius: '6px',
                          cursor: statusSaving ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        {statusSaving ? t('saving', 'שומר...') : t('moveToPending', 'בהמתנה')}
                      </button>
                    </div>
                  )}
                  {canChangeArticleStatus() && articleData.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        type="button"
                        disabled={statusSaving}
                        onClick={() => handleArticleDecision('approved')}
                        style={{
                          padding: '4px 14px',
                          background: 'transparent',
                          color: statusSaving ? '#aaa' : '#3d8c5c',
                          border: `1px solid ${statusSaving ? '#aaa' : '#3d8c5c'}`,
                          borderRadius: '6px',
                          cursor: statusSaving ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        ✔ {t('approveArticle', 'אשר מאמר')}
                      </button>
                      <button
                        type="button"
                        disabled={statusSaving}
                        onClick={() => handleArticleDecision('rejected')}
                        style={{
                          padding: '4px 14px',
                          background: 'transparent',
                          color: statusSaving ? '#aaa' : '#b84f5a',
                          border: `1px solid ${statusSaving ? '#aaa' : '#b84f5a'}`,
                          borderRadius: '6px',
                          cursor: statusSaving ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        ✖ {t('rejectArticle', 'דחה מאמר')}
                      </button>
                    </div>
                  )}
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
                    {t('articleLinkLabel', 'קישור למאמר')}:
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

              {articleData.articleFile?.url && (
                <div style={{ marginTop: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    color: '#666'
                  }}>
                    {t('articleFileLabel', 'קובץ המאמר (PDF / Word)')}:
                  </label>
                  <a
                    href={articleData.articleFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#667eea',
                      textDecoration: 'none',
                      fontSize: '16px',
                      wordBreak: 'break-all',
                    }}
                    onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                  >
                    📄 {articleData.articleFile.name || t('downloadArticleFile', 'הורד קובץ המאמר')}
                  </a>
                </div>
              )}

              {articleData.notes && (
                <div style={{ marginTop: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '10px',
                    color: '#666'
                  }}>
                    {t('notesFreeText', 'הערות')}:
                  </label>
                  <p style={{ fontSize: '16px', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {articleData.notes}
                  </p>
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
