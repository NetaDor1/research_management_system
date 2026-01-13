import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import DetailModal from '../components/DetailModal';
import './Research.css';

const Patents = () => {
  const { isAdmin, user, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('alphabetical');
  const [patentsData, setPatentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPatentId, setSelectedPatentId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch patents from Firestore
  useEffect(() => {
    const fetchPatents = async () => {
      if (!db) {
        console.error('Firestore database not initialized');
        setError('מסד הנתונים לא מאותחל');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      
      try {
        console.log('Connecting to Firestore for patents...');
        const patentsRef = collection(db, 'patents');
        let querySnapshot;

        // Filter by researcher if not admin
        if (userRole === 'RESEARCHER' && user?.id) {
          console.log('Fetching patents for researcher:', user.id, user.name);
          
          // Try with orderBy first
          try {
            const q = query(
              patentsRef,
              where('researcherId', '==', user.id),
              orderBy('registrationDate', 'desc')
            );
            querySnapshot = await getDocs(q);
          } catch (orderByError) {
            // If orderBy fails (missing index), try without orderBy
            console.warn('OrderBy failed (may need index), trying without orderBy:', orderByError.message);
            const q = query(
              patentsRef,
              where('researcherId', '==', user.id)
            );
            querySnapshot = await getDocs(q);
          }
        } else {
          console.log('Fetching all patents (admin mode)');
          try {
            const q = query(patentsRef, orderBy('registrationDate', 'desc'));
            querySnapshot = await getDocs(q);
          } catch (orderByError) {
            // If orderBy fails, try without orderBy
            console.warn('OrderBy failed, trying without orderBy:', orderByError.message);
            querySnapshot = await getDocs(patentsRef);
          }
        }

        console.log(`Found ${querySnapshot.docs.length} patent documents`);

        const patentsList = querySnapshot.docs.map((doc) => {
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
            title: data.title || data.projectTitle || 'ללא כותרת',
            researcher: data.researcherName || data.researcher || 'חוקר',
            status: data.status || 'in-process',
            registrationDate: toDateString(data.registrationDate || data.submissionDate || data.createdAt),
            isNew: data.isNew || false,
            researcherId: data.researcherId, // Keep for debugging
          };
        });

        // Sort by date if we couldn't use orderBy
        if (userRole === 'RESEARCHER' && user?.id) {
          patentsList.sort((a, b) => {
            const dateA = new Date(a.registrationDate || 0);
            const dateB = new Date(b.registrationDate || 0);
            return dateB - dateA; // Descending order
          });
        }

        console.log(`Loaded ${patentsList.length} patents`);
        if (userRole === 'RESEARCHER') {
          console.log('Patents for researcher:', patentsList.map(p => ({ 
            id: p.id, 
            researcherId: p.researcherId, 
            title: p.title,
            match: p.researcherId === user.id
          })));
        }

        setPatentsData(patentsList);
      } catch (err) {
        console.error('Error fetching patents:', err);
        console.error('Error details:', {
          code: err.code,
          message: err.message,
          stack: err.stack
        });
        console.error('User role:', userRole);
        console.error('User ID:', user?.id);
        console.error('DB initialized:', !!db);
        
        let errorMessage = 'שגיאה בטעינת פטנטים';
        if (err.code === 'failed-precondition') {
          errorMessage = 'נדרש index ב-Firestore. אנא צור index עבור השדות: researcherId, registrationDate';
        } else if (err.code === 'permission-denied') {
          errorMessage = 'אין הרשאה לגשת לפטנטים. אנא בדוק את כללי האבטחה ב-Firestore';
        } else if (err.message) {
          errorMessage = `שגיאה: ${err.message}`;
        }
        
        setError(errorMessage);
        setPatentsData([]);
      } finally {
        setLoading(false);
      }
    };

    if (userRole && user) {
      fetchPatents();
    }
  }, [userRole, user?.id]);

  // Data is already filtered by Firestore query
  const filteredByRole = useMemo(() => {
    return patentsData;
  }, [patentsData]);

  // Filter and sort patents
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

    // Sort
    if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));
    }

    return filtered;
  }, [filteredByRole, searchTerm, filterStatus, sortBy]);

  const handlePatentClick = (patentId) => {
    setSelectedPatentId(patentId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPatentId(null);
  };

  const handleAddPatent = () => {
    navigate('/patents/new');
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

  return (
    <div className="research-page">
      <div className="research-header">
        <h1>אוסף פטנטים</h1>
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
              <option value="registered">רשום</option>
              <option value="approved">אושר</option>
              <option value="in-process">בהליך</option>
              <option value="rejected">נדחה</option>
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
              <option value="date">תאריך רישום</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="no-results">
          <p>טוען פטנטים...</p>
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
            onClick={handleAddPatent}
            type="button"
          >
            <h3 className="add-research-title">הוספת פטנט חדש</h3>
          </button>
        )}

        {!loading && !error && filteredAndSorted.map((patent) => (
          <button
            key={patent.id}
            className="research-card"
            onClick={() => handlePatentClick(patent.id)}
          >
            {patent.isNew && <span className="new-badge">חדש!</span>}
            <h3 className="research-title">{patent.title}</h3>
            <p className="research-researcher">{patent.researcher}</p>
            <button className={`status-button ${getStatusClass(patent.status)}`}>
              {getStatusLabel(patent.status)}
            </button>
          </button>
        ))}
      </div>

      {!loading && !error && filteredAndSorted.length === 0 && (
        <div className="no-results">
          <p>לא נמצאו פטנטים</p>
        </div>
      )}

      <DetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        itemId={selectedPatentId}
        type="patent"
      />
    </div>
  );
};

export default Patents;
