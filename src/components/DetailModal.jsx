import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';
import { normalizeAcademicYear } from '../utils/academicYear';
import { getBudgetComponentLabel } from '../utils/budgetComponents';
import './DetailModal.css';

const DetailModal = ({ isOpen, onClose, itemId, type }) => {
  const { t, language } = useLanguage();
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchItemDetails = useCallback(async () => {
    if (!db) {
      setError(t('dbNotInitialized', 'מסד הנתונים לא מאותחל'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const collectionName = type === 'research' ? 'researchProposals' : 
                           type === 'patent' ? 'patents' : 'articles';
      
      const docRef = doc(db, collectionName, itemId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setItemData(data);
      } else {
        setError(t('itemNotFound', 'הפריט לא נמצא'));
      }
    } catch (err) {
      console.error('Error fetching item details:', err);
      setError(t('loadDetailsError', 'שגיאה בטעינת הפרטים'));
    } finally {
      setLoading(false);
    }
  }, [itemId, type, t]);

  useEffect(() => {
    if (isOpen && itemId) {
      fetchItemDetails();
    } else {
      // Reset state when modal closes
      setItemData(null);
      setError('');
      setLoading(false);
    }
  }, [isOpen, itemId, fetchItemDetails]);

  const formatDate = (timestamp) => {
    if (!timestamp) return t('notSpecified', 'לא צוין');
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL');
      }
      if (timestamp && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL');
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL');
      }
      return String(timestamp);
    } catch (e) {
      return String(timestamp);
    }
  };

  const formatCurrency = (amount, currency = 'ILS') => {
    if (!amount) return t('notSpecified', 'לא צוין');
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
    const locale = language === 'en' ? 'en-US' : 'he-IL';
    return `${currencySymbol} ${Number(amount).toLocaleString(locale)}`;
  };

  if (!isOpen) return null;

  const renderResearchDetails = () => {
    if (!itemData) return null;

    return (
      <div className="detail-content">
        <div className="detail-section">
          <h3>{t('generalDetails', 'פרטים כלליים')}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t('projectTitleLabel', 'כותרת הפרוייקט שהוגש לקרן חיצונית')}:</label>
              <span>{itemData.projectTitle || t('notSpecified', 'לא צוין')}</span>
            </div>
            <div className="detail-item">
              <label>{t('fundNameLabel', 'שם הקרן אליה הוגשה הבקשה')}:</label>
              <span>{itemData.fundName || t('notSpecified', 'לא צוין')}</span>
            </div>
            <div className="detail-item">
              <label>{t('submissionPathLabel', 'מסלול ההגשה לקרן')}:</label>
              <span>{itemData.submissionPath || t('notSpecified', 'לא צוין')}</span>
            </div>
            <div className="detail-item">
              <label>{t('researcherRoleLabel', 'תפקיד החוקר בהצעת המחקר')}:</label>
              <span>{itemData.researcherRole || t('notSpecified', 'לא צוין')}</span>
            </div>
            <div className="detail-item">
              <label>{t('proposalStageLabel', 'שלב ההצעה')}:</label>
              <span>{itemData.proposalStage || t('notSpecified', 'לא צוין')}</span>
            </div>
            <div className="detail-item">
              <label>{t('researcher', 'חוקר')}:</label>
              <span>{itemData.researcherName || t('notSpecified', 'לא צוין')}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>{t('researchPeriod', 'תקופת המחקר')}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t('startDateLabel', 'תאריך לועזי של תחילת המחקר (dd/mm/yyyy)')}:</label>
              <span>{formatDate(itemData.researchStartDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('endDateLabel', 'תאריך לועזי של סוף המחקר (dd/mm/yyyy)')}:</label>
              <span>{formatDate(itemData.researchEndDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('totalResearchYears', 'סה"כ תקופת המחקר בשנים (חישוב אוטומטי)')}:</label>
              <span>{itemData.researchDurationYears || t('notSpecified', 'לא צוין')}</span>
            </div>
            <div className="detail-item">
              <label>{t('academicYearLabel', 'שנה אקדמית (תרגום אוטומטי)')}:</label>
              <span>{normalizeAcademicYear(itemData.academicYear, itemData.researchStartDate) || t('notSpecified', 'לא צוין')}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>{t('budgetTitle', 'תקציב')}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t('totalBudgetRequested', 'סה"כ התקציב המבוקש (חישוב אוטומטי)')}:</label>
              <span>{formatCurrency(itemData.totalBudget, itemData.currency)}</span>
            </div>
            <div className="detail-item">
              <label>{t('budgetCurrency', 'מטבע התקציב')}:</label>
              <span>{itemData.currency || 'ILS'}</span>
            </div>
            <div className="detail-item">
              <label>{t('budgetConvertedIls', 'התקציב המתורגם לשקלים (חישוב אוטומטי)')}:</label>
              <span>{formatCurrency(itemData.convertedBudget, 'ILS')}</span>
            </div>
          </div>
          {itemData.budgetComponents && Object.keys(itemData.budgetComponents).length > 0 && (
            <div className="budget-components">
              <h4>{t('budgetComponentsLabel', 'רכיבי התקציב')}:</h4>
              <div className="budget-list">
                {Object.entries(itemData.budgetComponents).map(([key, value]) => (
                  <div key={key} className="budget-item">
                    <span className="budget-label">{getBudgetComponentLabel(key, t)}:</span>
                    <span className="budget-value">{formatCurrency(value, itemData.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {itemData.partners && itemData.partners.length > 0 && (
          <div className="detail-section">
            <h3>{t('partnersProjectTitle', 'שותפים לפרוייקט')}</h3>
            <div className="partners-list">
              {itemData.partners.map((partner, index) => (
                <div key={index} className="partner-card">
                  <div className="partner-detail">
                    <label>{t('partnerName', 'שם השותף')}:</label>
                    <span>{partner.name || t('notSpecified', 'לא צוין')}</span>
                  </div>
                  <div className="partner-detail">
                    <label>{t('partnerEmail', 'אימייל של השותף')}:</label>
                    <span>{partner.email || t('notSpecified', 'לא צוין')}</span>
                  </div>
                  <div className="partner-detail">
                    <label>{t('partnerInstitution', 'המוסד של השותף')}:</label>
                    <span>{partner.institution || t('notSpecified', 'לא צוין')}</span>
                  </div>
                  {partner.country && (
                    <div className="partner-detail">
                      <label>{t('partnerCountry', 'מדינה שבה השותף נמצא')}:</label>
                      <span>{partner.country}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="detail-section">
          <h3>{t('additionalInfoTitle', 'מידע נוסף')}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t('expectedResponseDateLabel', 'תאריך משוער לקבלת תשובות קבלה / דחיה מהקרנות החיצוניות')}:</label>
              <span>{formatDate(itemData.expectedResponseDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('status', 'סטטוס')}:</label>
              <span className={`status-badge status-${itemData.status || 'pending'}`}>
                {itemData.status === 'awarded' ? t('awarded', 'זכייה') : 
                 itemData.status === 'pending' ? t('pending', 'המתנה') : 
                 itemData.status === 'rejected' ? t('rejected', 'לא אושר') : itemData.status}
              </span>
            </div>
            <div className="detail-item">
              <label>{t('patents', 'פטנטים')}:</label>
              <span>{itemData.hasPatent ? t('yes', 'כן') : t('no', 'לא')}</span>
            </div>
          </div>
        </div>

        {itemData.notes && (
          <div className="detail-section">
            <h3>{t('notesFreeText', 'הערות (כתיבה חופשית)')}</h3>
            <p className="notes-text">{itemData.notes}</p>
          </div>
        )}
      </div>
    );
  };

  const getPatentStatusLabel = (status) => {
    switch (status) {
      case 'registered':
        return t('registered', 'רשום');
      case 'approved':
        return t('approved', 'אושר');
      case 'in-process':
        return t('inProcess', 'בהליך');
      case 'rejected':
        return t('rejected', 'נדחה');
      default:
        return status || t('notSpecified', 'לא צוין');
    }
  };

  const getArticleStatusLabel = (status) => {
    switch (status) {
      case 'published':
        return t('published', 'פורסם');
      case 'in-review':
        return t('inReview', 'בביקורת');
      case 'rejected':
        return t('rejected', 'נדחה');
      default:
        return status || t('notSpecified', 'לא צוין');
    }
  };

  const getPublicationTypeLabel = (type) => {
    switch (type) {
      case 'journal':
        return t('journal', 'כתב עת');
      case 'conference':
        return t('conference', 'כנס');
      default:
        return type || t('notSpecified', 'לא צוין');
    }
  };

  const notSpecified = t('notSpecified', 'לא צוין');

  const renderPatentDetails = () => {
    if (!itemData) return null;

    return (
      <div className="detail-content">
        <div className="detail-section">
          <h3>{t('generalDetails', 'פרטים כלליים')}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t('projectTitleShort', 'כותרת הפרויקט')}:</label>
              <span>{itemData.projectTitle || itemData.title || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('patentInstitutionPercentage', 'אחוז המוסד')}:</label>
              <span>{itemData.institutionPercentage || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('submissionPathShort', 'מסלול הגשה')}:</label>
              <span>{itemData.submissionPath || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('researcherRoleShort', 'תפקיד החוקר')}:</label>
              <span>{itemData.researcherRole || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('researcher', 'חוקר')}:</label>
              <span>{itemData.researcherName || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('status', 'סטטוס')}:</label>
              <span className={`status-badge status-${itemData.status || 'in-process'}`}>
                {getPatentStatusLabel(itemData.status)}
              </span>
            </div>
            <div className="detail-item">
              <label>{t('patentStage', 'שלב הפטנט')}:</label>
              <span>{itemData.patentStage || notSpecified}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>{t('commercializationUnit', 'יחידת מסחור')}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t('commercializationUnit', 'יחידת מסחור')}:</label>
              <span>{itemData.commercializationUnit || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('contact1', 'איש קשר 1')}:</label>
              <span>{itemData.commercializationContact1 || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('email1', 'אימייל 1')}:</label>
              <span>{itemData.commercializationEmail1 || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('contact2', 'איש קשר 2')}:</label>
              <span>{itemData.commercializationContact2 || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('email2', 'אימייל 2')}:</label>
              <span>{itemData.commercializationEmail2 || notSpecified}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>{t('datesTitle', 'תאריכים')}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t('patentDateSubmission', 'תאריך הגשת הבקשה')}:</label>
              <span>{formatDate(itemData.submissionDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('patentDateInitialReview', 'תאריך בדיקה ראשונית')}:</label>
              <span>{formatDate(itemData.initialReviewDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('patentDateExamination', 'תאריך בחינה')}:</label>
              <span>{formatDate(itemData.examinationDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('patentDateApproval', 'תאריך אישור')}:</label>
              <span>{formatDate(itemData.approvalDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('patentDateRegistration', 'תאריך רישום')}:</label>
              <span>{formatDate(itemData.registrationDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('patentDatePublication', 'תאריך פרסום')}:</label>
              <span>{formatDate(itemData.publicationDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('patentDateRenewal', 'תאריך חידוש')}:</label>
              <span>{formatDate(itemData.renewalDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('patentDateExpiry', 'תאריך תפוגה')}:</label>
              <span>{formatDate(itemData.expiryDate)}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>{t('budgetTitle', 'תקציב')}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t('totalBudget', 'תקציב כולל')}:</label>
              <span>{formatCurrency(itemData.totalBudget, itemData.currency)}</span>
            </div>
            <div className="detail-item">
              <label>{t('currency', 'מטבע')}:</label>
              <span>{itemData.currency || 'ILS'}</span>
            </div>
            <div className="detail-item">
              <label>{t('convertedBudget', 'תקציב מומר')}:</label>
              <span>{formatCurrency(itemData.convertedBudget, 'ILS')}</span>
            </div>
          </div>
          {itemData.stageBudgets && Object.keys(itemData.stageBudgets).length > 0 && (
            <div className="budget-components">
              <h4>{t('stageBudgetByStage', 'תקציב לפי שלבים')}:</h4>
              <div className="budget-list">
                {Object.entries(itemData.stageBudgets).map(([key, value]) => (
                  <div key={key} className="budget-item">
                    <span className="budget-label">{key}:</span>
                    <span className="budget-value">{formatCurrency(value, itemData.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {itemData.partners && itemData.partners.length > 0 && (
          <div className="detail-section">
            <h3>{t('partners', 'שותפים')}</h3>
            <div className="partners-list">
              {itemData.partners.map((partner, index) => (
                <div key={index} className="partner-card">
                  <div className="partner-detail">
                    <label>{t('name', 'שם')}:</label>
                    <span>{partner.name || notSpecified}</span>
                  </div>
                  <div className="partner-detail">
                    <label>{t('email', 'אימייל')}:</label>
                    <span>{partner.email || notSpecified}</span>
                  </div>
                  <div className="partner-detail">
                    <label>{t('institution', 'מוסד')}:</label>
                    <span>{partner.institution || notSpecified}</span>
                  </div>
                  {partner.percentage && (
                    <div className="partner-detail">
                      <label>{t('percentage', 'אחוז')}:</label>
                      <span>{partner.percentage}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {itemData.notes && (
          <div className="detail-section">
            <h3>{t('notesFreeText', 'הערות')}</h3>
            <p className="notes-text">{itemData.notes}</p>
          </div>
        )}
      </div>
    );
  };

  const renderArticleDetails = () => {
    if (!itemData) return null;

    return (
      <div className="detail-content">
        <div className="detail-section">
          <h3>{t('generalDetails', 'פרטים כלליים')}</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>{t('articleTitleShort', 'כותרת המאמר')}:</label>
              <span>{itemData.title || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('journalNameShort', 'שם העיתון')}:</label>
              <span>{itemData.journalName || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('journalRankingShort', 'דירוג העיתון')}:</label>
              <span>{itemData.journalRanking || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('publicationYearShort', 'שנת פרסום')}:</label>
              <span>{itemData.publicationYear || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('publicationDateLabel', 'תאריך פרסום')}:</label>
              <span>{formatDate(itemData.publicationDate)}</span>
            </div>
            <div className="detail-item">
              <label>{t('publicationTypeLabel', 'סוג פרסום')}:</label>
              <span>{getPublicationTypeLabel(itemData.publicationType)}</span>
            </div>
            <div className="detail-item">
              <label>{t('researcher', 'חוקר')}:</label>
              <span>{itemData.researcherName || notSpecified}</span>
            </div>
            <div className="detail-item">
              <label>{t('status', 'סטטוס')}:</label>
              <span className={`status-badge status-${itemData.status || 'published'}`}>
                {getArticleStatusLabel(itemData.status)}
              </span>
            </div>
          </div>
        </div>

        {itemData.articleLink && (
          <div className="detail-section">
            <h3>{t('articleLinkLabel', 'קישור למאמר')}</h3>
            <div className="detail-item">
              <a href={itemData.articleLink} target="_blank" rel="noopener noreferrer" className="article-link">
                {itemData.articleLink}
              </a>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {type === 'research' ? t('researchDetailsTitle', 'פרטי מחקר') : 
             type === 'patent' ? t('patentDetailsTitle', 'פרטי פטנט') : t('articleDetailsTitle', 'פרטי מאמר')}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {loading && (
            <div className="loading-state">
              <p>{t('loadingDetails', 'טוען פרטים...')}</p>
            </div>
          )}
          
          {error && (
            <div className="error-state">
              <p>{error}</p>
            </div>
          )}
          
          {!loading && !error && (
            <>
              {type === 'research' && renderResearchDetails()}
              {type === 'patent' && renderPatentDetails()}
              {type === 'article' && renderArticleDetails()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
