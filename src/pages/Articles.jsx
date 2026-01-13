import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import DetailModal from '../components/DetailModal';
import './Research.css';

const Articles = () => {
  const { isAdmin, user, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('alphabetical');
  const [articlesData, setArticlesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

        console.log(`Found ${querySnapshot.docs.length} article documents`);

        const articlesList = querySnapshot.docs.map((doc) => {
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
      filtered = filtered.filter(item => item.status === filterStatus);
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

  const handleArticleClick = (articleId) => {
    setSelectedArticleId(articleId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedArticleId(null);
  };

  const handleAddArticle = () => {
    navigate('/articles/new');
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

  return (
    <div className="research-page">
      <div className="research-header">
        <h1>אוסף מאמרים</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="חיפוש"
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-container">
          <div className="filter-group">
            <label>סינון לפי:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">סטטוס</option>
              <option value="published">פורסם</option>
              <option value="in-review">בביקורת</option>
              <option value="rejected">נדחה</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">סוג פרסום</option>
              <option value="journal">כתב עת</option>
              <option value="conference">כנס</option>
            </select>
          </div>
          <div className="sort-group">
            <label>מיון לפי:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="alphabetical">אלף בית</option>
              <option value="date">תאריך פרסום</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="no-results">
          <p>טוען מאמרים...</p>
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
            <h3 className="add-research-title">הוספת מאמר חדש</h3>
          </button>
        )}

        {!loading && !error && filteredAndSorted.map((article) => (
          <button
            key={article.id}
            className="research-card"
            onClick={() => handleArticleClick(article.id)}
          >
            {article.isNew && <span className="new-badge">חדש!</span>}
            <h3 className="research-title">{article.title}</h3>
            <p className="research-researcher">{article.researcher}</p>
            <button className={`status-button ${getStatusClass(article.status)}`}>
              {getStatusLabel(article.status)}
            </button>
          </button>
        ))}
      </div>

      {!loading && !error && filteredAndSorted.length === 0 && (
        <div className="no-results">
          <p>לא נמצאו מאמרים</p>
        </div>
      )}

      <DetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        itemId={selectedArticleId}
        type="article"
      />
    </div>
  );
};

export default Articles;
