import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import './DetailModal.css';

const DetailModal = ({ isOpen, onClose, itemId, type }) => {
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchItemDetails = useCallback(async () => {
    if (!db) {
      setError('מסד הנתונים לא מאותחל');
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
        setError('הפריט לא נמצא');
      }
    } catch (err) {
      console.error('Error fetching item details:', err);
      setError('שגיאה בטעינת הפרטים');
    } finally {
      setLoading(false);
    }
  }, [itemId, type]);

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

  if (!isOpen) return null;

  const renderResearchDetails = () => {
    if (!itemData) return null;

    return (
      <div className="detail-content">
        <div className="detail-section">
          <h3>פרטים כלליים</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>כותרת הפרויקט:</label>
              <span>{itemData.projectTitle || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>שם הקרן:</label>
              <span>{itemData.fundName || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>מסלול הגשה:</label>
              <span>{itemData.submissionPath || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>תפקיד החוקר:</label>
              <span>{itemData.researcherRole || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>שלב ההצעה:</label>
              <span>{itemData.proposalStage || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>חוקר:</label>
              <span>{itemData.researcherName || 'לא צוין'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>תקופת המחקר</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>תאריך התחלה:</label>
              <span>{formatDate(itemData.researchStartDate)}</span>
            </div>
            <div className="detail-item">
              <label>תאריך סיום:</label>
              <span>{formatDate(itemData.researchEndDate)}</span>
            </div>
            <div className="detail-item">
              <label>משך המחקר (שנים):</label>
              <span>{itemData.researchDurationYears || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>שנה אקדמית:</label>
              <span>{itemData.academicYear || 'לא צוין'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>תקציב</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>תקציב כולל:</label>
              <span>{formatCurrency(itemData.totalBudget, itemData.currency)}</span>
            </div>
            <div className="detail-item">
              <label>מטבע:</label>
              <span>{itemData.currency || 'ILS'}</span>
            </div>
            <div className="detail-item">
              <label>תקציב מומר:</label>
              <span>{formatCurrency(itemData.convertedBudget, 'ILS')}</span>
            </div>
          </div>
          {itemData.budgetComponents && Object.keys(itemData.budgetComponents).length > 0 && (
            <div className="budget-components">
              <h4>רכיבי תקציב:</h4>
              <div className="budget-list">
                {Object.entries(itemData.budgetComponents).map(([key, value]) => (
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
            <h3>שותפים</h3>
            <div className="partners-list">
              {itemData.partners.map((partner, index) => (
                <div key={index} className="partner-card">
                  <div className="partner-detail">
                    <label>שם:</label>
                    <span>{partner.name || 'לא צוין'}</span>
                  </div>
                  <div className="partner-detail">
                    <label>אימייל:</label>
                    <span>{partner.email || 'לא צוין'}</span>
                  </div>
                  <div className="partner-detail">
                    <label>מוסד:</label>
                    <span>{partner.institution || 'לא צוין'}</span>
                  </div>
                  {partner.country && (
                    <div className="partner-detail">
                      <label>מדינה:</label>
                      <span>{partner.country}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="detail-section">
          <h3>מידע נוסף</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>תאריך תגובה צפוי:</label>
              <span>{formatDate(itemData.expectedResponseDate)}</span>
            </div>
            <div className="detail-item">
              <label>סטטוס:</label>
              <span className={`status-badge status-${itemData.status || 'pending'}`}>
                {itemData.status === 'awarded' ? 'זכייה' : 
                 itemData.status === 'pending' ? 'המתנה' : 
                 itemData.status === 'rejected' ? 'לא אושר' : itemData.status}
              </span>
            </div>
            <div className="detail-item">
              <label>יש פטנט:</label>
              <span>{itemData.hasPatent ? 'כן' : 'לא'}</span>
            </div>
          </div>
        </div>

        {itemData.notes && (
          <div className="detail-section">
            <h3>הערות</h3>
            <p className="notes-text">{itemData.notes}</p>
          </div>
        )}
      </div>
    );
  };

  const renderPatentDetails = () => {
    if (!itemData) return null;

    return (
      <div className="detail-content">
        <div className="detail-section">
          <h3>פרטים כלליים</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>כותרת הפרויקט:</label>
              <span>{itemData.projectTitle || itemData.title || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>אחוז המוסד:</label>
              <span>{itemData.institutionPercentage || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>מסלול הגשה:</label>
              <span>{itemData.submissionPath || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>תפקיד החוקר:</label>
              <span>{itemData.researcherRole || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>חוקר:</label>
              <span>{itemData.researcherName || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>סטטוס:</label>
              <span className={`status-badge status-${itemData.status || 'in-process'}`}>
                {itemData.status === 'registered' ? 'רשום' : 
                 itemData.status === 'approved' ? 'אושר' : 
                 itemData.status === 'in-process' ? 'בהליך' : 
                 itemData.status === 'rejected' ? 'נדחה' : itemData.status}
              </span>
            </div>
            <div className="detail-item">
              <label>שלב הפטנט:</label>
              <span>{itemData.patentStage || 'לא צוין'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>יחידת מסחור</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>יחידת מסחור:</label>
              <span>{itemData.commercializationUnit || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>איש קשר 1:</label>
              <span>{itemData.commercializationContact1 || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>אימייל 1:</label>
              <span>{itemData.commercializationEmail1 || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>איש קשר 2:</label>
              <span>{itemData.commercializationContact2 || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>אימייל 2:</label>
              <span>{itemData.commercializationEmail2 || 'לא צוין'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>תאריכים</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>תאריך הגשת הבקשה:</label>
              <span>{formatDate(itemData.submissionDate)}</span>
            </div>
            <div className="detail-item">
              <label>תאריך בדיקה ראשונית:</label>
              <span>{formatDate(itemData.initialReviewDate)}</span>
            </div>
            <div className="detail-item">
              <label>תאריך בחינה:</label>
              <span>{formatDate(itemData.examinationDate)}</span>
            </div>
            <div className="detail-item">
              <label>תאריך אישור:</label>
              <span>{formatDate(itemData.approvalDate)}</span>
            </div>
            <div className="detail-item">
              <label>תאריך רישום:</label>
              <span>{formatDate(itemData.registrationDate)}</span>
            </div>
            <div className="detail-item">
              <label>תאריך פרסום:</label>
              <span>{formatDate(itemData.publicationDate)}</span>
            </div>
            <div className="detail-item">
              <label>תאריך חידוש:</label>
              <span>{formatDate(itemData.renewalDate)}</span>
            </div>
            <div className="detail-item">
              <label>תאריך תפוגה:</label>
              <span>{formatDate(itemData.expiryDate)}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>תקציב</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>תקציב כולל:</label>
              <span>{formatCurrency(itemData.totalBudget, itemData.currency)}</span>
            </div>
            <div className="detail-item">
              <label>מטבע:</label>
              <span>{itemData.currency || 'ILS'}</span>
            </div>
            <div className="detail-item">
              <label>תקציב מומר:</label>
              <span>{formatCurrency(itemData.convertedBudget, 'ILS')}</span>
            </div>
          </div>
          {itemData.stageBudgets && Object.keys(itemData.stageBudgets).length > 0 && (
            <div className="budget-components">
              <h4>תקציב לפי שלבים:</h4>
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
            <h3>שותפים</h3>
            <div className="partners-list">
              {itemData.partners.map((partner, index) => (
                <div key={index} className="partner-card">
                  <div className="partner-detail">
                    <label>שם:</label>
                    <span>{partner.name || 'לא צוין'}</span>
                  </div>
                  <div className="partner-detail">
                    <label>אימייל:</label>
                    <span>{partner.email || 'לא צוין'}</span>
                  </div>
                  <div className="partner-detail">
                    <label>מוסד:</label>
                    <span>{partner.institution || 'לא צוין'}</span>
                  </div>
                  {partner.percentage && (
                    <div className="partner-detail">
                      <label>אחוז:</label>
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
            <h3>הערות</h3>
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
          <h3>פרטים כלליים</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>כותרת המאמר:</label>
              <span>{itemData.title || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>שם העיתון:</label>
              <span>{itemData.journalName || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>דירוג העיתון:</label>
              <span>{itemData.journalRanking || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>שנת פרסום:</label>
              <span>{itemData.publicationYear || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>תאריך פרסום:</label>
              <span>{formatDate(itemData.publicationDate)}</span>
            </div>
            <div className="detail-item">
              <label>סוג פרסום:</label>
              <span>{itemData.publicationType === 'journal' ? 'כתב עת' : 
                     itemData.publicationType === 'conference' ? 'כנס' : 
                     itemData.publicationType || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>חוקר:</label>
              <span>{itemData.researcherName || 'לא צוין'}</span>
            </div>
            <div className="detail-item">
              <label>סטטוס:</label>
              <span className={`status-badge status-${itemData.status || 'published'}`}>
                {itemData.status === 'published' ? 'פורסם' : 
                 itemData.status === 'in-review' ? 'בביקורת' : 
                 itemData.status === 'rejected' ? 'נדחה' : itemData.status}
              </span>
            </div>
          </div>
        </div>

        {itemData.articleLink && (
          <div className="detail-section">
            <h3>קישור למאמר</h3>
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
            {type === 'research' ? 'פרטי מחקר' : 
             type === 'patent' ? 'פרטי פטנט' : 'פרטי מאמר'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {loading && (
            <div className="loading-state">
              <p>טוען פרטים...</p>
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
