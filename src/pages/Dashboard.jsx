import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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

const Dashboard = () => {
  const { userRole, user, setUserRole, setUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Filter data based on user role
  const userResearch = useMemo(() => {
    if (userRole === 'ADMIN') {
      return mockResearchData;
    } else {
      if (!user || !user.name) return [];
      return mockResearchData.filter(item => item.researcher === user.name);
    }
  }, [userRole, user]);

  const userArticles = useMemo(() => {
    if (userRole === 'ADMIN') {
      return mockArticlesData;
    } else {
      if (!user || !user.name) return [];
      return mockArticlesData.filter(item => item.researcher === user.name);
    }
  }, [userRole, user]);

  const userPatents = useMemo(() => {
    if (userRole === 'ADMIN') {
      return mockPatentsData;
    } else {
      if (!user || !user.name) return [];
      return mockPatentsData.filter(item => item.researcher === user.name);
    }
  }, [userRole, user]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (userRole === 'ADMIN') {
      return {
        totalResearch: mockResearchData.length,
        pendingResearch: mockResearchData.filter(r => r.status === 'pending').length,
        awardedResearch: mockResearchData.filter(r => r.status === 'awarded').length,
        totalArticles: mockArticlesData.length,
        publishedArticles: mockArticlesData.filter(a => a.status === 'published').length,
        totalPatents: mockPatentsData.length,
        registeredPatents: mockPatentsData.filter(p => p.status === 'registered' || p.status === 'approved').length,
      };
    } else {
      return {
        totalResearch: userResearch.length,
        pendingResearch: userResearch.filter(r => r.status === 'pending').length,
        awardedResearch: userResearch.filter(r => r.status === 'awarded').length,
        totalArticles: userArticles.length,
        publishedArticles: userArticles.filter(a => a.status === 'published').length,
        totalPatents: userPatents.length,
        registeredPatents: userPatents.filter(p => p.status === 'registered' || p.status === 'approved').length,
      };
    }
  }, [userRole, userResearch, userArticles, userPatents]);

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>
          {userRole === 'ADMIN'
            ? t('dashboardTitleAdmin', 'לוח בקרה - רשות המחקר')
            : `${t('dashboardTitleResearcher', 'לוח בקרה')} - ${user?.name || t('researcher', 'חוקר')}`}
        </h1>
        <p className="welcome-text">
          {userRole === 'ADMIN' 
            ? t('dashboardWelcomeAdmin', 'ברוכים הבאים למערכת ניהול מחקר. כאן תוכלו לנהל ולעקוב אחר כל המחקרים, המאמרים והפטנטים במכללה.')
            : t('dashboardWelcomeResearcher', 'ברוכים הבאים למערכת ניהול מחקר. כאן תוכלו לראות ולנהל את המחקרים, המאמרים והפטנטים שלכם.')}
        </p>

        {/* Role Switcher for Testing */}
        <div className="role-switcher">
          <span>{t('roleCurrent', 'תפקיד נוכחי')}: <strong>{userRole === 'ADMIN' ? 'Research Authority (ADMIN)' : 'Researcher (RESEARCHER)'}</strong></span>
          <button 
            className="role-switch-btn"
            onClick={() => {
              const newRole = userRole === 'ADMIN' ? 'RESEARCHER' : 'ADMIN';
              
              if (newRole === 'RESEARCHER') {
                setUser({ id: '2', name: 'יוסי כהן', email: 'researcher@college.ac.il' });
              } else {
                setUser({ id: '1', name: 'רשות המחקר', email: 'admin@college.ac.il' });
              }
              
              setUserRole(newRole);
            }}
          >
            {t('switchTo', 'החלף ל')}-{userRole === 'ADMIN' ? t('researcher', 'חוקר') : t('researchAuthority', 'רשות המחקר')}
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="dashboard-stats">
          <div className="stat-card" onClick={() => navigate('/research')}>
            <div className="stat-icon">🔬</div>
            <div className="stat-info">
              <h3>{t('research', 'מחקרים')}</h3>
              <div className="stat-numbers">
                <span className="stat-total">{stats.totalResearch}</span>
                <span className="stat-details">
                  {stats.pendingResearch} {t('pendingCount', 'בהמתנה')} • {stats.awardedResearch} {t('approvedCount', 'אושרו')}
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigate('/articles')}>
            <div className="stat-icon">📄</div>
            <div className="stat-info">
              <h3>{t('articles', 'מאמרים')}</h3>
              <div className="stat-numbers">
                <span className="stat-total">{stats.totalArticles}</span>
                <span className="stat-details">
                  {stats.publishedArticles} {t('publishedCount', 'פורסמו')}
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigate('/patents')}>
            <div className="stat-icon">📜</div>
            <div className="stat-info">
              <h3>{t('patents', 'פטנטים')}</h3>
              <div className="stat-numbers">
                <span className="stat-total">{stats.totalPatents}</span>
                <span className="stat-details">
                  {stats.registeredPatents} {t('registeredCount', 'רשומים')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Items */}
        <div className="dashboard-recent">
          <h2>{t('recentItems', 'פריטים אחרונים')}</h2>
          <div className="recent-items">
            {userResearch.slice(0, 3).map((research) => (
              <div key={research.id} className="recent-item" onClick={() => navigate(`/research/${research.id}`)}>
                <span className="recent-icon">🔬</span>
                <div className="recent-content">
                  <h4>{research.title}</h4>
                  {userRole === 'ADMIN' && <p className="recent-researcher">{research.researcher}</p>}
                  <span className={`recent-status status-${research.status}`}>
                    {research.status === 'awarded' ? t('awarded', 'זכייה') : 
                     research.status === 'pending' ? t('pending', 'המתנה') : t('rejected', 'לא אושר')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

