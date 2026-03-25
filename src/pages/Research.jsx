import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../services/firebase';
import DetailModal from '../components/DetailModal';
import './Research.css';

const Research = () => {
  const { isAdmin, user, userRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPatents, setFilterPatents] = useState('all');
  const [sortBy, setSortBy] = useState('alphabetical');
  const [researchData, setResearchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResearchId, setSelectedResearchId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch research data from Firestore
  const fetchResearch = React.useCallback(async () => {
    if (!db) {
      console.error('Firestore database not initialized');
      setError('מסד הנתונים לא מאותחל');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Connecting to Firestore...');
      const researchRef = collection(db, 'researchProposals');
      let querySnapshot;

      // Filter by researcher if not admin
      if (userRole === 'RESEARCHER' && user?.id) {
        console.log('Fetching research for researcher:', user.id, user.name);
        
        // Try with orderBy first
        try {
          const q = query(
            researchRef,
            where('researcherId', '==', user.id),
            orderBy('createdAt', 'desc')
          );
          querySnapshot = await getDocs(q);
        } catch (orderByError) {
          // If orderBy fails (missing index), try without orderBy
          console.warn('OrderBy failed (may need index), trying without orderBy:', orderByError.message);
          const q = query(
            researchRef,
            where('researcherId', '==', user.id)
          );
          querySnapshot = await getDocs(q);
        }
      } else {
        console.log('Fetching all research (admin mode)');
        try {
          const q = query(researchRef, orderBy('createdAt', 'desc'));
          querySnapshot = await getDocs(q);
        } catch (orderByError) {
          // If orderBy fails, try without orderBy
          console.warn('OrderBy failed, trying without orderBy:', orderByError.message);
          querySnapshot = await getDocs(researchRef);
        }
      }

      console.log(`Found ${querySnapshot.docs.length} documents`);

      const researchList = querySnapshot.docs.map((doc) => {
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
          title: data.projectTitle || data.title || 'ללא כותרת',
          researcher: data.researcherName || data.researcher || 'חוקר',
          status: data.status || 'pending',
          hasPatent: data.hasPatent || false,
          submissionDate: toDateString(data.submissionDate || data.createdAt),
          isNew: data.isNew || false,
          researcherId: data.researcherId, // Keep for debugging
        };
      });

      // Sort by date if we couldn't use orderBy
      if (userRole === 'RESEARCHER' && user?.id) {
        researchList.sort((a, b) => {
          const dateA = new Date(a.submissionDate || 0);
          const dateB = new Date(b.submissionDate || 0);
          return dateB - dateA; // Descending order
        });
      }

      console.log(`Loaded ${researchList.length} research proposals`);
      if (userRole === 'RESEARCHER') {
        console.log('Research for researcher:', researchList.map(r => ({ 
          id: r.id, 
          researcherId: r.researcherId, 
          title: r.title,
          match: r.researcherId === user.id
        })));
      }

      setResearchData(researchList);
    } catch (err) {
      console.error('Error fetching research:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      console.error('User role:', userRole);
      console.error('User ID:', user?.id);
      console.error('DB initialized:', !!db);
      
      let errorMessage = 'שגיאה בטעינת מחקרים';
      if (err.code === 'failed-precondition') {
        errorMessage = 'נדרש index ב-Firestore. אנא צור index עבור השדות: researcherId, createdAt';
      } else if (err.code === 'permission-denied') {
        errorMessage = 'אין הרשאה לגשת למחקרים. אנא בדוק את כללי האבטחה ב-Firestore';
      } else if (err.message) {
        errorMessage = `שגיאה: ${err.message}`;
      }
      
      setError(errorMessage);
      setResearchData([]);
    } finally {
      setLoading(false);
    }
  }, [userRole, user?.id]);

  useEffect(() => {
    if (userRole && user) {
      fetchResearch();
    }
  }, [userRole, user?.id, fetchResearch]);

  // Refresh when page becomes visible (user returns from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRole && user) {
        console.log('Page became visible, refreshing research list...');
        fetchResearch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userRole, user, fetchResearch]);

  // Data is already filtered by Firestore query, so use researchData directly
  const filteredByRole = useMemo(() => {
    return researchData;
  }, [researchData]);

  // Filter and sort research
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

    // Patents filter
    if (filterPatents === 'with') {
      filtered = filtered.filter(item => item.hasPatent);
    } else if (filterPatents === 'without') {
      filtered = filtered.filter(item => !item.hasPatent);
    }

    // Sort
    if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
    }

    return filtered;
  }, [filteredByRole, searchTerm, filterStatus, filterPatents, sortBy]);

  const handleResearchClick = (researchId) => {
    if (isAdmin()) {
      // Admin navigates to detail page
      navigate(`/research/${researchId}`);
    } else {
      // Researcher uses modal
      setSelectedResearchId(researchId);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedResearchId(null);
  };

  const handleAddResearch = () => {
    navigate('/research/new');
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'awarded':
        return t('awarded', 'זכייה');
      case 'pending':
        return t('pending', 'המתנה');
      case 'rejected':
        return t('rejected', 'לא אושר');
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

  return (
    <div className="research-page">
      <div className="research-content">
        <div className="research-header">
        <h1>{t('researchCollection', 'אוסף מחקרים')}</h1>
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
              <option value="awarded">{t('awarded', 'זכייה')}</option>
              <option value="pending">{t('pending', 'המתנה')}</option>
              <option value="rejected">{t('rejected', 'לא אושר')}</option>
            </select>
            <select
              value={filterPatents}
              onChange={(e) => setFilterPatents(e.target.value)}
              className="filter-select"
            >
              <option value="all">{t('researchCollection', 'אוסף מחקרים')} + פטנטים</option>
              <option value="with">{t('patents', 'פטנטים')}</option>
              <option value="without">{t('research', 'מחקרים')} בלבד</option>
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
              <option value="date">{t('date', 'תאריך')} הגשה</option>
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
            onClick={handleAddResearch}
          >
            <h3 className="add-research-title">{t('addNewResearch', 'הוספת מחקר חדש')}</h3>
          </button>
        )}

        {!loading && !error && filteredAndSorted.map((research) => (
          <button
            key={research.id}
            className="research-card"
            onClick={() => handleResearchClick(research.id)}
          >
            {research.isNew && <span className="new-badge">{t('newBadge', 'חדש!')}</span>}
            <h3 className="research-title">{research.title}</h3>
            <p className="research-researcher">{research.researcher}</p>
            <button className={`status-button ${getStatusClass(research.status)}`}>
              {getStatusLabel(research.status)}
            </button>
          </button>
        ))}
      </div>

      {!loading && !error && filteredAndSorted.length === 0 && (
        <div className="no-results">
          <p>{t('noResearchFound', 'לא נמצאו מחקרים')}</p>
        </div>
      )}

        {!isAdmin() && (
          <DetailModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            itemId={selectedResearchId}
            type="research"
          />
        )}
      </div>
    </div>
  );
};

export default Research;
