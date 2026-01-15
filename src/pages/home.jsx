import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import './Page.css';
import './Research.css';

const Home = () => {
  const { isAdmin, user, userRole } = useAuth();
  const navigate = useNavigate();

  // Research state
  const [researchData, setResearchData] = useState([]);
  const [researchLoading, setResearchLoading] = useState(true);
  const [researchError, setResearchError] = useState('');

  // Patents state
  const [patentsData, setPatentsData] = useState([]);
  const [patentsLoading, setPatentsLoading] = useState(true);
  const [patentsError, setPatentsError] = useState('');

  // Articles state
  const [articlesData, setArticlesData] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState('');

  // Helper function to convert Firestore Timestamp to date string
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

  // Fetch research data
  const fetchResearch = React.useCallback(async () => {
    if (!db || userRole !== 'RESEARCHER' || !user?.id) {
      setResearchLoading(false);
      return;
    }

    setResearchLoading(true);
    setResearchError('');
    
    try {
      const researchRef = collection(db, 'researchProposals');
      let querySnapshot;

      try {
        const q = query(
          researchRef,
          where('researcherId', '==', user.id),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderByError) {
        const q = query(
          researchRef,
          where('researcherId', '==', user.id)
        );
        querySnapshot = await getDocs(q);
      }

      const researchList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.projectTitle || data.title || 'ללא כותרת',
          researcher: data.researcherName || data.researcher || 'חוקר',
          status: data.status || 'pending',
          hasPatent: data.hasPatent || false,
          submissionDate: toDateString(data.submissionDate || data.createdAt),
          isNew: data.isNew || false,
        };
      });

      researchList.sort((a, b) => {
        const dateA = new Date(a.submissionDate || 0);
        const dateB = new Date(b.submissionDate || 0);
        return dateB - dateA;
      });

      setResearchData(researchList);
    } catch (err) {
      console.error('Error fetching research:', err);
      setResearchError('שגיאה בטעינת מחקרים');
      setResearchData([]);
    } finally {
      setResearchLoading(false);
    }
  }, [userRole, user?.id]);

  // Fetch patents data
  const fetchPatents = React.useCallback(async () => {
    if (!db || userRole !== 'RESEARCHER' || !user?.id) {
      setPatentsLoading(false);
      return;
    }

    setPatentsLoading(true);
    setPatentsError('');
    
    try {
      const patentsRef = collection(db, 'patents');
      let querySnapshot;

      try {
        const q = query(
          patentsRef,
          where('researcherId', '==', user.id),
          orderBy('registrationDate', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderByError) {
        const q = query(
          patentsRef,
          where('researcherId', '==', user.id)
        );
        querySnapshot = await getDocs(q);
      }

      const patentsList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.projectTitle || 'ללא כותרת',
          researcher: data.researcherName || data.researcher || 'חוקר',
          status: data.status || 'in-process',
          registrationDate: toDateString(data.registrationDate || data.submissionDate || data.createdAt),
          isNew: data.isNew || false,
        };
      });

      patentsList.sort((a, b) => {
        const dateA = new Date(a.registrationDate || 0);
        const dateB = new Date(b.registrationDate || 0);
        return dateB - dateA;
      });

      setPatentsData(patentsList);
    } catch (err) {
      console.error('Error fetching patents:', err);
      setPatentsError('שגיאה בטעינת פטנטים');
      setPatentsData([]);
    } finally {
      setPatentsLoading(false);
    }
  }, [userRole, user?.id]);

  // Fetch articles data
  const fetchArticles = React.useCallback(async () => {
    if (!db || userRole !== 'RESEARCHER' || !user?.id) {
      setArticlesLoading(false);
      return;
    }

    setArticlesLoading(true);
    setArticlesError('');
    
    try {
      const articlesRef = collection(db, 'articles');
      let querySnapshot;

      try {
        const q = query(
          articlesRef,
          where('researcherId', '==', user.id),
          orderBy('publicationDate', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderByError) {
        const q = query(
          articlesRef,
          where('researcherId', '==', user.id)
        );
        querySnapshot = await getDocs(q);
      }

      const articlesList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'ללא כותרת',
          researcher: data.researcherName || data.researcher || 'חוקר',
          status: data.status || 'in-review',
          publicationDate: toDateString(data.publicationDate || data.createdAt),
          publicationType: data.publicationType || 'journal',
          isNew: data.isNew || false,
        };
      });

      articlesList.sort((a, b) => {
        const dateA = new Date(a.publicationDate || 0);
        const dateB = new Date(b.publicationDate || 0);
        return dateB - dateA;
      });

      setArticlesData(articlesList);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setArticlesError('שגיאה בטעינת מאמרים');
      setArticlesData([]);
    } finally {
      setArticlesLoading(false);
    }
  }, [userRole, user?.id]);

  useEffect(() => {
    if (userRole === 'RESEARCHER' && user) {
      fetchResearch();
      fetchPatents();
      fetchArticles();
    }
  }, [userRole, user?.id, fetchResearch, fetchPatents, fetchArticles]);

  // Refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRole === 'RESEARCHER' && user) {
        fetchResearch();
        fetchPatents();
        fetchArticles();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userRole, user, fetchResearch, fetchPatents, fetchArticles]);

  const handleResearchClick = (researchId) => {
    navigate(`/research/${researchId}`);
  };

  const handlePatentClick = (patentId) => {
    navigate(`/patents/${patentId}`);
  };

  const handleArticleClick = (articleId) => {
    navigate(`/articles/${articleId}`);
  };

  const handleAddResearch = () => {
    navigate('/research/new');
  };

  const handleAddPatent = () => {
    navigate('/patents/new');
  };

  const handleAddArticle = () => {
    navigate('/articles/new');
  };

  const getStatusLabel = (status, type = 'research') => {
    if (type === 'research') {
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
    } else if (type === 'patent') {
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
    } else if (type === 'article') {
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
    }
    return status;
  };

  const getStatusClass = (status, type = 'research') => {
    if (type === 'research' || type === 'patent' || type === 'article') {
      if (status === 'awarded' || status === 'registered' || status === 'approved' || status === 'published') {
        return 'status-awarded';
      }
      if (status === 'pending' || status === 'in-process' || status === 'in-review') {
        return 'status-pending';
      }
      if (status === 'rejected') {
        return 'status-rejected';
      }
    }
    return '';
  };

  // Show admin view or researcher view
  if (isAdmin()) {
    return (
      <div className="page-container">
        <div className="page-content">
          <h1>עמוד הבית - רשות המחקר</h1>
          <p className="welcome-text">ברוכים הבאים למערכת ניהול מחקר</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>עמוד הבית</h1>
        <p className="welcome-text">ברוכים הבאים למערכת ניהול מחקר</p>

        {/* Research Section */}
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ 
            marginBottom: '20px', 
            textAlign: 'right',
            borderBottom: '3px solid rgb(188, 192, 203)',
            paddingBottom: '10px',
            fontWeight: 'bold',
            color: '#2d3748'
          }}>אוסף מחקרים</h2>
          
          {researchLoading && (
            <div className="no-results">
              <p>טוען מחקרים...</p>
            </div>
          )}

          {researchError && (
            <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
              <p>{researchError}</p>
            </div>
          )}

          <div className="research-grid">
            <button
              className="research-card add-research-card"
              onClick={handleAddResearch}
            >
              <h3 className="add-research-title">הוספת מחקר חדש</h3>
            </button>

            {!researchLoading && !researchError && researchData.map((research) => (
              <button
                key={research.id}
                className="research-card"
                onClick={() => handleResearchClick(research.id)}
              >
                {research.isNew && <span className="new-badge">חדש!</span>}
                <h3 className="research-title">{research.title}</h3>
                <p className="research-researcher">{research.researcher}</p>
                <button className={`status-button ${getStatusClass(research.status, 'research')}`}>
                  {getStatusLabel(research.status, 'research')}
                </button>
              </button>
            ))}
          </div>

          {!researchLoading && !researchError && researchData.length === 0 && (
            <div className="no-results">
              <p>לא נמצאו מחקרים</p>
            </div>
          )}
        </div>

        {/* Patents Section */}
        <div style={{ marginTop: '60px' }}>
          <h2 style={{ 
            marginBottom: '20px', 
            textAlign: 'right',
            borderBottom: '3px solid rgb(188, 192, 203)',
            paddingBottom: '10px',
            fontWeight: 'bold',
            color: '#2d3748'
          }}>פטנטים</h2>
          
          {patentsLoading && (
            <div className="no-results">
              <p>טוען פטנטים...</p>
            </div>
          )}

          {patentsError && (
            <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
              <p>{patentsError}</p>
            </div>
          )}

          <div className="research-grid">
            <button
              className="research-card add-research-card"
              onClick={handleAddPatent}
              type="button"
            >
              <h3 className="add-research-title">הוספת פטנט חדש</h3>
            </button>

            {!patentsLoading && !patentsError && patentsData.map((patent) => (
              <button
                key={patent.id}
                className="research-card"
                onClick={() => handlePatentClick(patent.id)}
              >
                {patent.isNew && <span className="new-badge">חדש!</span>}
                <h3 className="research-title">{patent.title}</h3>
                <p className="research-researcher">{patent.researcher}</p>
                <button className={`status-button ${getStatusClass(patent.status, 'patent')}`}>
                  {getStatusLabel(patent.status, 'patent')}
                </button>
              </button>
            ))}
          </div>

          {!patentsLoading && !patentsError && patentsData.length === 0 && (
            <div className="no-results">
              <p>לא נמצאו פטנטים</p>
            </div>
          )}
        </div>

        {/* Articles Section */}
        <div style={{ marginTop: '60px' }}>
          <h2 style={{ 
            marginBottom: '20px', 
            textAlign: 'right',
            borderBottom: '3px solid rgb(188, 192, 203)',
            paddingBottom: '10px',
            fontWeight: 'bold',
            color: '#2d3748'
          }}>מאמרים</h2>
          
          {articlesLoading && (
            <div className="no-results">
              <p>טוען מאמרים...</p>
            </div>
          )}

          {articlesError && (
            <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
              <p>{articlesError}</p>
            </div>
          )}

          <div className="research-grid">
            <button
              className="research-card add-research-card"
              onClick={handleAddArticle}
              type="button"
            >
              <h3 className="add-research-title">הוספת מאמר חדש</h3>
            </button>

            {!articlesLoading && !articlesError && articlesData.map((article) => (
              <button
                key={article.id}
                className="research-card"
                onClick={() => handleArticleClick(article.id)}
              >
                {article.isNew && <span className="new-badge">חדש!</span>}
                <h3 className="research-title">{article.title}</h3>
                <p className="research-researcher">{article.researcher}</p>
                <button className={`status-button ${getStatusClass(article.status, 'article')}`}>
                  {getStatusLabel(article.status, 'article')}
                </button>
              </button>
            ))}
          </div>

          {!articlesLoading && !articlesError && articlesData.length === 0 && (
            <div className="no-results">
              <p>לא נמצאו מאמרים</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Home;
