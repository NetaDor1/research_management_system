import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
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

  // Fetch patents from Firestore
  useEffect(() => {
    const fetchPatents = async () => {
      setLoading(true);
      setError('');
      
      try {
        const patentsRef = collection(db, 'patents');
        let q = query(patentsRef, orderBy('registrationDate', 'desc'));

        // Filter by researcher if not admin
        if (userRole === 'RESEARCHER' && user?.id) {
          q = query(
            patentsRef,
            where('researcherId', '==', user.id),
            orderBy('registrationDate', 'desc')
          );
        }

        const querySnapshot = await getDocs(q);
        const patentsList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Convert Firestore Timestamp to date string
          const toDateString = (timestamp) => {
            if (!timestamp) return '';
            if (timestamp.toDate) {
              return timestamp.toDate().toISOString().split('T')[0];
            }
            return String(timestamp);
          };

          return {
            id: doc.id,
            title: data.title || 'ללא כותרת',
            researcher: data.researcherName || data.researcher || 'חוקר',
            status: data.status || 'in-process',
            registrationDate: toDateString(data.registrationDate),
            isNew: data.isNew || false,
          };
        });

        setPatentsData(patentsList);
      } catch (err) {
        console.error('Error fetching patents:', err);
        setError('שגיאה בטעינת פטנטים');
        setPatentsData([]);
      } finally {
        setLoading(false);
      }
    };

    if (userRole) {
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
    // TODO: Navigate to patent details page
    navigate(`/patents/${patentId}`);
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
    </div>
  );
};

export default Patents;
