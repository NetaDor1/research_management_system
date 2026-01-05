import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Research.css';

// Mock data - TODO: Replace with actual data from Firebase/API
const initialMockResearchData = [
  { id: 1, title: 'מחקר 1', researcher: 'נטע דור', status: 'pending', hasPatent: false, submissionDate: '2024-01-15', isNew: false },
  { id: 2, title: 'מחקר 2', researcher: 'טליה אליהו', status: 'awarded', hasPatent: true, submissionDate: '2024-02-20', isNew: false },
  { id: 3, title: 'מחקר 3', researcher: 'דוד כהן', status: 'awarded', hasPatent: false, submissionDate: '2024-03-10', isNew: false },
  { id: 4, title: 'מחקר 4', researcher: 'שרה לוי', status: 'awarded', hasPatent: true, submissionDate: '2024-04-05', isNew: false },
  { id: 5, title: 'מחקר 5', researcher: 'יוסי ישראלי', status: 'pending', hasPatent: false, submissionDate: '2024-05-12', isNew: true },
  { id: 6, title: 'מחקר 6', researcher: 'מיכל רוזן', status: 'rejected', hasPatent: false, submissionDate: '2024-06-01', isNew: false },
  { id: 7, title: 'מחקר 7', researcher: 'אבי כהן', status: 'pending', hasPatent: true, submissionDate: '2024-06-15', isNew: false },
  { id: 8, title: 'מחקר 8', researcher: 'רותם שמיר', status: 'pending', hasPatent: false, submissionDate: '2024-07-01', isNew: false },
];

// Load research data from localStorage or use initial data
const loadResearchData = () => {
  try {
    const saved = localStorage.getItem('researchData');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading research data:', error);
  }
  return initialMockResearchData;
};

const Research = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPatents, setFilterPatents] = useState('all');
  const [sortBy, setSortBy] = useState('alphabetical');
  const [researchData, setResearchData] = useState(() => loadResearchData());

  // Listen for new research submissions
  useEffect(() => {
    const handleStorageChange = () => {
      const updated = loadResearchData();
      setResearchData(updated);
    };

    // Listen for custom event when new research is added
    window.addEventListener('researchAdded', handleStorageChange);
    
    // Also check localStorage periodically
    const interval = setInterval(() => {
      const updated = loadResearchData();
      if (JSON.stringify(updated) !== JSON.stringify(researchData)) {
        setResearchData(updated);
      }
    }, 1000);

    return () => {
      window.removeEventListener('researchAdded', handleStorageChange);
      clearInterval(interval);
    };
  }, [researchData]);

  // Filter research based on user role
  const filteredByRole = useMemo(() => {
    if (isAdmin()) {
      // ADMIN sees all research proposals
      return researchData;
    } else {
      // RESEARCHER sees only their own research
      if (!user || !user.name) {
        return [];
      }
      return researchData.filter(item => item.researcher === user.name);
    }
  }, [isAdmin, user, researchData]);

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

      {filteredAndSorted.length === 0 && (
        <div className="no-results">
          <p>לא נמצאו מחקרים</p>
        </div>
      )}
    </div>
  );
};

export default Research;
