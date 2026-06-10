import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../services/firebase';
import { shouldShowNewBadge } from '../utils/newBadge';
import './Research.css';
import { isSubmitted } from '../utils/submissionStatus';

const Articles = () => {
  const { isAdmin, user, userRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('alphabetical');
  const [articlesData, setArticlesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const getDisplayStatus = (item) =>
    item.submissionStatus === 'draft' ? 'draft' : item.status;

  // Fetch articles from Firestore
  useEffect(() => {
    const fetchArticles = async () => {
      if (!db) {
        console.error('Firestore database not initialized');
        setError('מסד הנתונים לא מאותחל');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      
      try {
        console.log('Connecting to Firestore for articles...');
        const articlesRef = collection(db, 'articles');
        let querySnapshot;

        // Filter by researcher if not admin
        if (userRole === 'RESEARCHER' && user?.id) {
          console.log('Fetching articles for researcher:', user.id, user.name);
          
          // Try with orderBy first
          try {
            const q = query(
              articlesRef,
              where('researcherId', '==', user.id),
              orderBy('publicationDate', 'desc')
            );
            querySnapshot = await getDocs(q);
          } catch (orderByError) {
            // If orderBy fails (missing index), try without orderBy
            console.warn('OrderBy failed (may need index), trying without orderBy:', orderByError.message);
            const q = query(
              articlesRef,
              where('researcherId', '==', user.id)
            );
            querySnapshot = await getDocs(q);
          }
        } else {
          console.log('Fetching all articles (admin mode)');
          try {
            const q = query(articlesRef, orderBy('publicationDate', 'desc'));
            querySnapshot = await getDocs(q);
          } catch (orderByError) {
            // If orderBy fails, try without orderBy
            console.warn('OrderBy failed, trying without orderBy:', orderByError.message);
            querySnapshot = await getDocs(articlesRef);
          }
        }

        const visibleDocs = userRole === 'ADMIN'
          ? querySnapshot.docs.filter((docItem) => isSubmitted(docItem.data()))
          : querySnapshot.docs;

        console.log(`Found ${visibleDocs.length} article documents`);

        const articlesList = visibleDocs.map((doc) => {
          const data = doc.data();
          
          // Convert Firestore Timestamp to date string
          const toDateString = (timestamp) => {
            if (!timestamp) return '';
            if (timestamp && typeof timestamp.toDate === 'function') {
              return timestamp.toDate().toISOString().split('T')[0];
            }
            if (timestamp && timestamp.seconds) {
              return new Date(timestamp.seconds * 1000).toISOString().split('T')[0];
            }
            return String(timestamp);
          };

          return {
            id: doc.id,
            title: data.title || 'ללא כותרת',
            researcher: data.researcherName || data.researcher || 'חוקר',
            status: data.status || 'published',
            submissionStatus: data.submissionStatus || 'submitted',
            publicationDate: toDateString(data.publicationDate),
            publicationType: data.publicationType || 'journal',
            isNew: data.isNew || false,
            researcherId: data.researcherId, // Keep for debugging
          };
        });

        // Sort by date if we couldn't use orderBy
        if (userRole === 'RESEARCHER' && user?.id) {
          articlesList.sort((a, b) => {
            const dateA = new Date(a.publicationDate || 0);
            const dateB = new Date(b.publicationDate || 0);
            return dateB - dateA; // Descending order
          });
        }

        console.log(`Loaded ${articlesList.length} articles`);
        if (userRole === 'RESEARCHER') {
          console.log('Articles for researcher:', articlesList.map(a => ({ 
            id: a.id, 
            researcherId: a.researcherId, 
            title: a.title,
            match: a.researcherId === user.id
          })));
        }

        setArticlesData(articlesList);
      } catch (err) {
        console.error('Error fetching articles:', err);
        console.error('Error details:', {
          code: err.code,
          message: err.message,
          stack: err.stack
        });
        console.error('User role:', userRole);
        console.error('User ID:', user?.id);
        console.error('DB initialized:', !!db);
        
        let errorMessage = 'שגיאה בטעינת מאמרים';
        if (err.code === 'failed-precondition') {
          errorMessage = 'נדרש index ב-Firestore. אנא צור index עבור השדות: researcherId, publicationDate';
        } else if (err.code === 'permission-denied') {
          errorMessage = 'אין הרשאה לגשת למאמרים. אנא בדוק את כללי האבטחה ב-Firestore';
        } else if (err.message) {
          errorMessage = `שגיאה: ${err.message}`;
        }
        
        setError(errorMessage);
        setArticlesData([]);
      } finally {
        setLoading(false);
      }
    };

    if (userRole && user) {
      fetchArticles();
    }
  }, [userRole, user?.id]);

  // Data is already filtered by Firestore query
  const filteredByRole = useMemo(() => {
    return articlesData;
  }, [articlesData]);

  // Filter and sort articles
  const filteredAndSorted = useMemo(() => {
    let filtered = [...filteredByRole];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.researcher.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((item) => getDisplayStatus(item) === filterStatus);
    }

    // Publication type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.publicationType === filterType);
    }

    // Sort
    if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));
    }

    return filtered;
  }, [filteredByRole, searchTerm, filterStatus, filterType, sortBy]);

  const handleArticleClick = (article) => {
    if (isAdmin()) {
      navigate(`/articles/${article.id}`);
      return;
    }
    if (article.submissionStatus === 'draft') {
      navigate(`/articles/new?edit=${article.id}`);
      return;
    }
    navigate(`/articles/${article.id}`);
  };

  const handleAddArticle = () => {
    navigate('/articles/new');
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft':
        return t('draft', 'טיוטה');
      case 'published':
        return t('published', 'פורסם');
      case 'in-review':
        return t('inReview', 'בביקורת');
      case 'rejected':
        return t('rejected', 'נדחה');
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'draft':
        return 'status-draft';
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

  return (
    <div className="research-page">
      <div className="research-content">
        <div className="research-header">
        <h1>{t('articlesCollection', 'אוסף מאמרים')}</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder={t('search', 'חיפוש')}
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-container">
          <div className="filter-group">
            <label>{t('filterBy', 'סינון לפי:')}</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">{t('status', 'סטטוס')}</option>
              <option value="draft">{t('draft', 'טיוטה')}</option>
              <option value="published">{t('published', 'פורסם')}</option>
              <option value="in-review">{t('inReview', 'בביקורת')}</option>
              <option value="rejected">{t('rejected', 'נדחה')}</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">{t('filterAllPublicationTypes', 'כל סוגי הפרסום')}</option>
              <option value="journal">{t('journal', 'כתב עת')}</option>
              <option value="conference">{t('conference', 'כנס')}</option>
            </select>
          </div>
          <div className="sort-group">
            <label>{t('sortBy', 'מיון לפי:')}</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="alphabetical">{t('alphabetical', 'אלף בית')}</option>
              <option value="date">{t('sortByPublicationDate', 'תאריך פרסום')}</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="no-results">
          <p>{t('loadingData', 'טוען נתונים...')}</p>
        </div>
      )}

      {error && (
        <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
          <p>{error}</p>
        </div>
      )}

      <div className="research-grid">
        {!isAdmin() && (
          <button
            className="research-card add-research-card"
            onClick={handleAddArticle}
            type="button"
          >
            <h3 className="add-research-title">{t('addNewArticle', 'הוספת מאמר חדש')}</h3>
          </button>
        )}

        {!loading && !error && filteredAndSorted.length === 0 && (
          <div className="no-results-grid-item">
            <p>{t('noArticlesFound', 'לא נמצאו מאמרים')}</p>
          </div>
        )}

        {!loading && !error && filteredAndSorted.map((article) => (
          <button
            key={article.id}
            className="research-card"
            onClick={() => handleArticleClick(article)}
          >
            {shouldShowNewBadge(article.isNew, article.publicationDate) && (
              <span className="new-badge">{t('newBadge', 'חדש!')}</span>
            )}
            <h3 className="research-title">{article.title}</h3>
            <p className="research-researcher">{article.researcher}</p>
            <button className={`status-button ${getStatusClass(getDisplayStatus(article))}`}>
              {getStatusLabel(getDisplayStatus(article))}
            </button>
          </button>
        ))}
      </div>

      </div>
    </div>
  );
};

export default Articles;
