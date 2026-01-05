import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Research.css';

// Mock data - TODO: Replace with actual data from Firebase/API
const mockPatentsData = [
  { id: 1, title: 'פטנט 1', researcher: 'נטע דור', status: 'registered', registrationDate: '2024-01-15', isNew: false },
  { id: 2, title: 'פטנט 2', researcher: 'טליה אליהו', status: 'approved', registrationDate: '2024-02-20', isNew: false },
  { id: 3, title: 'פטנט 3', researcher: 'דוד כהן', status: 'in-process', registrationDate: '2024-03-10', isNew: false },
  { id: 4, title: 'פטנט 4', researcher: 'שרה לוי', status: 'registered', registrationDate: '2024-04-05', isNew: false },
  { id: 5, title: 'פטנט 5', researcher: 'יוסי ישראלי', status: 'in-process', registrationDate: '2024-05-12', isNew: true },
  { id: 6, title: 'פטנט 6', researcher: 'מיכל רוזן', status: 'rejected', registrationDate: '2024-06-01', isNew: false },
  { id: 7, title: 'פטנט 7', researcher: 'אבי כהן', status: 'approved', registrationDate: '2024-06-15', isNew: false },
  { id: 8, title: 'פטנט 8', researcher: 'רותם שמיר', status: 'in-process', registrationDate: '2024-07-01', isNew: false },
];

const Patents = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('alphabetical');

  // Filter patents based on user role
  const filteredByRole = useMemo(() => {
    if (isAdmin()) {
      // ADMIN sees all patents
      return mockPatentsData;
    } else {
      // RESEARCHER sees only their own patents
      if (!user || !user.name) {
        return [];
      }
      return mockPatentsData.filter(item => item.researcher === user.name);
    }
  }, [isAdmin, user]);

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

      <div className="research-grid">
        {filteredAndSorted.map((patent) => (
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

      {filteredAndSorted.length === 0 && (
        <div className="no-results">
          <p>לא נמצאו פטנטים</p>
        </div>
      )}
    </div>
  );
};

export default Patents;
