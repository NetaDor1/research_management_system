import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import './Page.css';
import './Research.css';

// Mock data - TODO: Replace with actual data from Firebase/API
const mockResearchData = [
  { id: 1, title: 'מחקר 1', researcher: 'נטע דור', status: 'pending', hasPatent: false, submissionDate: '2024-01-15', isNew: false },
  { id: 2, title: 'מחקר 2', researcher: 'טליה אליהו', status: 'awarded', hasPatent: true, submissionDate: '2024-02-20', isNew: false },
  { id: 3, title: 'מחקר 3', researcher: 'דוד כהן', status: 'awarded', hasPatent: false, submissionDate: '2024-03-10', isNew: false },
  { id: 4, title: 'מחקר 4', researcher: 'שרה לוי', status: 'awarded', hasPatent: true, submissionDate: '2024-04-05', isNew: false },
  { id: 5, title: 'מחקר 5', researcher: 'יוסי ישראלי', status: 'pending', hasPatent: false, submissionDate: '2024-05-12', isNew: true },
  { id: 6, title: 'מחקר 6', researcher: 'מיכל רוזן', status: 'rejected', hasPatent: false, submissionDate: '2024-06-01', isNew: false },
  { id: 7, title: 'מחקר 7', researcher: 'אבי כהן', status: 'pending', hasPatent: true, submissionDate: '2024-06-15', isNew: false },
  { id: 8, title: 'מחקר 8', researcher: 'רותם שמיר', status: 'pending', hasPatent: false, submissionDate: '2024-07-01', isNew: false },
];

const mockArticlesData = [
  { id: 1, title: 'מאמר 1', researcher: 'נטע דור', status: 'published', publicationDate: '2024-01-15', publicationType: 'journal', isNew: false },
  { id: 2, title: 'מאמר 2', researcher: 'טליה אליהו', status: 'published', publicationDate: '2024-02-20', publicationType: 'conference', isNew: false },
  { id: 3, title: 'מאמר 3', researcher: 'דוד כהן', status: 'in-review', publicationDate: '2024-03-10', publicationType: 'journal', isNew: false },
  { id: 4, title: 'מאמר 4', researcher: 'שרה לוי', status: 'published', publicationDate: '2024-04-05', publicationType: 'journal', isNew: false },
  { id: 5, title: 'מאמר 5', researcher: 'יוסי ישראלי', status: 'in-review', publicationDate: '2024-05-12', publicationType: 'conference', isNew: true },
];

const mockPatentsData = [
  { id: 1, title: 'פטנט 1', researcher: 'נטע דור', status: 'registered', registrationDate: '2024-01-15', isNew: false },
  { id: 2, title: 'פטנט 2', researcher: 'טליה אליהו', status: 'approved', registrationDate: '2024-02-20', isNew: false },
  { id: 3, title: 'פטנט 3', researcher: 'דוד כהן', status: 'in-process', registrationDate: '2024-03-10', isNew: false },
];

const Statistics = () => {
  const { isAdmin, user } = useAuth();

  // Filter data based on user role
  const userResearch = useMemo(() => {
    if (isAdmin()) {
      return mockResearchData;
    } else {
      if (!user || !user.name) return [];
      return mockResearchData.filter(item => item.researcher === user.name);
    }
  }, [isAdmin, user]);

  const userArticles = useMemo(() => {
    if (isAdmin()) {
      return mockArticlesData;
    } else {
      if (!user || !user.name) return [];
      return mockArticlesData.filter(item => item.researcher === user.name);
    }
  }, [isAdmin, user]);

  const userPatents = useMemo(() => {
    if (isAdmin()) {
      return mockPatentsData;
    } else {
      if (!user || !user.name) return [];
      return mockPatentsData.filter(item => item.researcher === user.name);
    }
  }, [isAdmin, user]);

  // Calculate statistics
  const stats = useMemo(() => {
    const research = isAdmin() ? mockResearchData : userResearch;
    const articles = isAdmin() ? mockArticlesData : userArticles;
    const patents = isAdmin() ? mockPatentsData : userPatents;

    return {
      totalResearch: research.length,
      pendingResearch: research.filter(r => r.status === 'pending').length,
      awardedResearch: research.filter(r => r.status === 'awarded').length,
      rejectedResearch: research.filter(r => r.status === 'rejected').length,
      researchWithPatents: research.filter(r => r.hasPatent).length,
      
      totalArticles: articles.length,
      publishedArticles: articles.filter(a => a.status === 'published').length,
      inReviewArticles: articles.filter(a => a.status === 'in-review').length,
      rejectedArticles: articles.filter(a => a.status === 'rejected').length,
      journalArticles: articles.filter(a => a.publicationType === 'journal').length,
      conferenceArticles: articles.filter(a => a.publicationType === 'conference').length,
      
      totalPatents: patents.length,
      registeredPatents: patents.filter(p => p.status === 'registered' || p.status === 'approved').length,
      inProcessPatents: patents.filter(p => p.status === 'in-process').length,
      rejectedPatents: patents.filter(p => p.status === 'rejected').length,
    };
  }, [isAdmin, userResearch, userArticles, userPatents]);

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>
          {isAdmin() ? 'סטטיסטיקות כלליות' : 'הסטטיסטיקות שלי'}
        </h1>
        <p className="welcome-text">
          {isAdmin() 
            ? 'סקירה כללית של כל המחקרים, המאמרים והפטנטים במכללה'
            : 'סקירה של המחקרים, המאמרים והפטנטים שלך'}
        </p>

        {/* Research Statistics */}
        <div className="statistics-section">
          <h2>🔬 מחקרים</h2>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-box-value">{stats.totalResearch}</div>
              <div className="stat-box-label">סה"כ מחקרים</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{stats.pendingResearch}</div>
              <div className="stat-box-label">בהמתנה</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{stats.awardedResearch}</div>
              <div className="stat-box-label">אושרו</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{stats.rejectedResearch}</div>
              <div className="stat-box-label">נדחו</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{stats.researchWithPatents}</div>
              <div className="stat-box-label">עם פטנטים</div>
            </div>
          </div>
        </div>

        {/* Articles Statistics */}
        <div className="statistics-section">
          <h2>📄 מאמרים</h2>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-box-value">{stats.totalArticles}</div>
              <div className="stat-box-label">סה"כ מאמרים</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{stats.publishedArticles}</div>
              <div className="stat-box-label">פורסמו</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{stats.inReviewArticles}</div>
              <div className="stat-box-label">בביקורת</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{stats.journalArticles}</div>
              <div className="stat-box-label">כתבי עת</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{stats.conferenceArticles}</div>
              <div className="stat-box-label">כנסים</div>
            </div>
          </div>
        </div>

        {/* Patents Statistics */}
        <div className="statistics-section">
          <h2>📜 פטנטים</h2>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-box-value">{stats.totalPatents}</div>
              <div className="stat-box-label">סה"כ פטנטים</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{stats.registeredPatents}</div>
              <div className="stat-box-label">רשומים/אושרו</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value">{stats.inProcessPatents}</div>
              <div className="stat-box-label">בהליך</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;

