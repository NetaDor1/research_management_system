import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Research.css';

// Mock data - TODO: Replace with actual data from Firebase/API
const mockArticlesData = [
  { id: 1, title: 'מאמר 1', researcher: 'נטע דור', status: 'published', publicationDate: '2024-01-15', publicationType: 'journal', isNew: false },
  { id: 2, title: 'מאמר 2', researcher: 'טליה אליהו', status: 'published', publicationDate: '2024-02-20', publicationType: 'conference', isNew: false },
  { id: 3, title: 'מאמר 3', researcher: 'דוד כהן', status: 'in-review', publicationDate: '2024-03-10', publicationType: 'journal', isNew: false },
  { id: 4, title: 'מאמר 4', researcher: 'שרה לוי', status: 'published', publicationDate: '2024-04-05', publicationType: 'journal', isNew: false },
  { id: 5, title: 'מאמר 5', researcher: 'יוסי ישראלי', status: 'in-review', publicationDate: '2024-05-12', publicationType: 'conference', isNew: true },
  { id: 6, title: 'מאמר 6', researcher: 'מיכל רוזן', status: 'rejected', publicationDate: '2024-06-01', publicationType: 'journal', isNew: false },
  { id: 7, title: 'מאמר 7', researcher: 'אבי כהן', status: 'published', publicationDate: '2024-06-15', publicationType: 'conference', isNew: false },
  { id: 8, title: 'מאמר 8', researcher: 'רותם שמיר', status: 'in-review', publicationDate: '2024-07-01', publicationType: 'journal', isNew: false },
];

const Articles = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('alphabetical');

  // Filter articles based on user role
  const filteredByRole = useMemo(() => {
    if (isAdmin()) {
      // ADMIN sees all articles
      return mockArticlesData;
    } else {
      // RESEARCHER sees only their own articles
      if (!user || !user.name) {
        return [];
      }
      return mockArticlesData.filter(item => item.researcher === user.name);
    }
  }, [isAdmin, user]);

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
    // TODO: Navigate to article details page
    navigate(`/articles/${articleId}`);
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

      <div className="research-grid">
        {filteredAndSorted.map((article) => (
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

      {filteredAndSorted.length === 0 && (
        <div className="no-results">
          <p>לא נמצאו מאמרים</p>
        </div>
      )}
    </div>
  );
};

export default Articles;
