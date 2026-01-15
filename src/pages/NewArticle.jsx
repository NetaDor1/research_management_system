import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import './Page.css';
import './Research.css';

const NewArticle = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  // Options for journal ranking
  const journalRankingOptions = [
    'Q1',
    'Q2',
    'Q3',
    'Q4'
  ];

  const [formData, setFormData] = useState({
    title: '',
    journalName: '',
    journalRanking: '',
    publicationYear: '',
    articleLink: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'כותרת המאמר חובה';
    }
    if (!formData.journalName.trim()) {
      newErrors.journalName = 'שם העיתון חובה';
    }
    if (!formData.journalRanking) {
      newErrors.journalRanking = 'דירוג העיתון חובה';
    }
    if (!formData.publicationYear) {
      newErrors.publicationYear = 'שנת הפרסום חובה';
    } else if (formData.publicationYear.length !== 4 || isNaN(formData.publicationYear)) {
      newErrors.publicationYear = 'שנת הפרסום חייבת להיות 4 ספרות';
    }
    if (formData.articleLink && !isValidUrl(formData.articleLink)) {
      newErrors.articleLink = 'קישור לא תקין';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('יש למלא את כל השדות החובה');
      return;
    }

    setIsSubmitting(true);

    try {
      const researcherId = user?.id || 'temp-user-id';
      const researcherName = user?.name || 'חוקר';

      console.log('Starting to save article...');
      console.log('Researcher ID:', researcherId);
      console.log('Researcher Name:', researcherName);

      // Convert publication year to date (first day of the year)
      const publicationDate = formData.publicationYear 
        ? Timestamp.fromDate(new Date(`${formData.publicationYear}-01-01`))
        : serverTimestamp();

      // Prepare article data
      const articleData = {
        // פרטים כלליים
        title: formData.title,
        journalName: formData.journalName,
        journalRanking: formData.journalRanking,
        publicationYear: formData.publicationYear,
        articleLink: formData.articleLink || '',
        
        // פרטי החוקר
        researcherId: researcherId,
        researcherName: researcherName,
        
        // סטטוס (ברירת מחדל - פורסם)
        status: 'published',
        publicationType: 'journal', // ברירת מחדל - כתב עת
        
        // תאריך פרסום
        publicationDate: publicationDate,
        
        // תאריכים מערכתיים
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isNew: true
      };

      console.log('Article data prepared:', articleData);

      // Create document in Firestore
      const docRef = await addDoc(collection(db, 'articles'), articleData);
      console.log('Document created with ID:', docRef.id);

      console.log('Article saved successfully!');
      alert('המאמר נשמר בהצלחה!');
      navigate('/articles');
    } catch (error) {
      console.error('Error saving article:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'שגיאה בשמירת המאמר. ';
      
      if (error.code === 'permission-denied') {
        errorMessage += 'אין הרשאה לשמור. בדקי את ה-Security Rules ב-Firebase.';
      } else if (error.code === 'unavailable') {
        errorMessage += 'Firebase לא זמין כרגע. נסי שוב מאוחר יותר.';
      } else {
        errorMessage += `פרטים: ${error.message || 'שגיאה לא ידועה'}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-content" style={{ maxWidth: '800px' }}>
        <h1>הוספת מאמר חדש</h1>
        <p className="form-subtitle">מלא/י את הפרטים הבאים להוספת מאמר</p>

        <form onSubmit={handleSubmit} className="research-form">
          <div className="form-section">
            <h2>פרטי המאמר</h2>
            
            <div className="form-group">
              <label>כותרת המאמר *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={errors.title ? 'error' : ''}
                placeholder="הכנס כותרת המאמר"
                required
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label>שם העיתון בו פורסם *</label>
              <input
                type="text"
                name="journalName"
                value={formData.journalName}
                onChange={handleInputChange}
                className={errors.journalName ? 'error' : ''}
                placeholder="הכנס שם העיתון"
                required
              />
              {errors.journalName && <span className="error-message">{errors.journalName}</span>}
            </div>

            <div className="form-group">
              <label>דירוג העיתון *</label>
              <select
                name="journalRanking"
                value={formData.journalRanking}
                onChange={handleInputChange}
                className={errors.journalRanking ? 'error' : ''}
                required
              >
                <option value="">בחר דירוג</option>
                {journalRankingOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.journalRanking && <span className="error-message">{errors.journalRanking}</span>}
            </div>

            <div className="form-group">
              <label>שנת הפרסום *</label>
              <input
                type="number"
                name="publicationYear"
                value={formData.publicationYear}
                onChange={handleInputChange}
                className={errors.publicationYear ? 'error' : ''}
                placeholder="שנה (4 ספרות, למשל: 2024)"
                min="1900"
                max="2100"
                maxLength={4}
                required
              />
              {errors.publicationYear && <span className="error-message">{errors.publicationYear}</span>}
            </div>

            <div className="form-group">
              <label>קישור למאמר</label>
              <input
                type="url"
                name="articleLink"
                value={formData.articleLink}
                onChange={handleInputChange}
                className={errors.articleLink ? 'error' : ''}
                placeholder="https://..."
              />
              {errors.articleLink && <span className="error-message">{errors.articleLink}</span>}
              {formData.articleLink && !errors.articleLink && (
                <a 
                  href={formData.articleLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'block', marginTop: '8px', color: '#667eea' }}
                >
                  פתח קישור →
                </a>
              )}
            </div>
          </div>

          {/* כפתורי שליחה */}
          <div className="form-actions">
            <button type="button" onClick={() => navigate(userRole === 'RESEARCHER' ? '/' : '/articles')} className="cancel-btn">
              ביטול
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'שומר...' : 'שמור מאמר'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewArticle;

