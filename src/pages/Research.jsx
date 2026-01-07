import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import './Research.css';

const Research = () => {
  const { isAdmin, user, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPatents, setFilterPatents] = useState('all');
  const [sortBy, setSortBy] = useState('alphabetical');
  const [researchData, setResearchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch research data from Firestore
  useEffect(() => {
    const fetchResearch = async () => {
      setLoading(true);
      setError('');
      
      try {
        const researchRef = collection(db, 'researchProposals');
        let q = query(researchRef, orderBy('createdAt', 'desc'));

        // Filter by researcher if not admin
        if (userRole === 'RESEARCHER' && user?.id) {
          q = query(
            researchRef,
            where('researcherId', '==', user.id),
            orderBy('createdAt', 'desc')
          );
        }

        const querySnapshot = await getDocs(q);
        const researchList = querySnapshot.docs.map((doc) => {
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
            title: data.projectTitle || data.title || 'ללא כותרת',
            researcher: data.researcherName || data.researcher || 'חוקר',
            status: data.status || 'pending',
            hasPatent: data.hasPatent || false,
            submissionDate: toDateString(data.submissionDate || data.createdAt),
            isNew: data.isNew || false,
          };
        });

        setResearchData(researchList);
      } catch (err) {
        console.error('Error fetching research:', err);
        setError('שגיאה בטעינת מחקרים');
        setResearchData([]);
      } finally {
        setLoading(false);
      }
    };

    if (userRole) {
      fetchResearch();
    }
  }, [userRole, user?.id]);

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
    // TODO: Navigate to research details page
    navigate(`/research/${researchId}`);
  };

  const handleAddResearch = () => {
    navigate('/research/new');
  };

  const getStatusLabel = (status) => {
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
      <div className="research-header">
        <h1>אוסף מחקרים</h1>
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
              <option value="awarded">זכייה</option>
              <option value="pending">המתנה</option>
              <option value="rejected">לא אושר</option>
            </select>
            <select
              value={filterPatents}
              onChange={(e) => setFilterPatents(e.target.value)}
              className="filter-select"
            >
              <option value="all">מחקרים עם פטנטים</option>
              <option value="with">עם פטנטים</option>
              <option value="without">ללא פטנטים</option>
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
              <option value="date">תאריך הגשת הצעה</option>
            </select>
          </div>
        </div>
      </div>

      <div className="research-grid">
        <button
          className="research-card add-research-card"
          onClick={handleAddResearch}
        >
          <h3 className="add-research-title">הוספת מחקר חדש</h3>
        </button>

        {filteredAndSorted.map((research) => (
          <button
            key={research.id}
            className="research-card"
            onClick={() => handleResearchClick(research.id)}
          >
            {research.isNew && <span className="new-badge">חדש!</span>}
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
          <p>לא נמצאו מחקרים</p>
        </div>
      )}
    </div>
  );
};

export default Research;
