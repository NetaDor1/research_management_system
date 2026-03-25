import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import './NavigationBar.css';

const NavigationBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, user, userRole } = useAuth();
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const toggleNav = () => {
    setIsOpen(!isOpen);
  };

  const closeNav = () => {
    setIsOpen(false);
  };

  const handleNavigate = (path) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeNav();
    window.location.assign(path);
  };

  // Navigation items - filtered by role
  // RESEARCHER sees only Home, Dashboard, Statistics, and Report Format
  // ADMIN sees all items including Research, Patents, and Articles
  const allNavItems = [
    { path: '/', label: t('home', 'עמוד הבית') },
    { path: '/dashboard', label: t('dashboard', 'לוח בקרה') },
    { path: '/research', label: t('research', 'מחקרים') },
    { path: '/patents', label: t('patents', 'פטנטים') },
    { path: '/articles', label: t('articles', 'מאמרים') },
    { path: '/statistics', label: t('statistics', 'סטטיסטיקות') },
    { path: '/report-format', label: t('reportsFormat', 'פורמט דו"חות') },
    { path: '/notifications', label: t('notifications', 'התראות') },
    { path: '/settings', label: t('settings', 'הגדרות') },
  ];

  // Filter nav items based on role
  const navItems = isAdmin() 
    ? allNavItems 
    : allNavItems.filter(item => 
        item.path === '/' || 
        item.path === '/dashboard' || 
        item.path === '/statistics' || 
        item.path === '/report-format' ||
        item.path === '/notifications' ||
        item.path === '/settings'
      );

  useEffect(() => {
    if (!db || !user?.id) return undefined;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUnreadCount(snapshot.size);
      },
      () => {
        setUnreadCount(0);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  // Admin: unread messages from researchers
  useEffect(() => {
    if (!db || !isAdmin()) return undefined;
    const q = query(collection(db, 'researcherMessages'), where('read', '==', false));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => setUnreadMessages(snapshot.size),
      () => setUnreadMessages(0)
    );
    return () => unsubscribe();
  }, [isAdmin]);

  // Researcher: unread admin replies in outbox
  useEffect(() => {
    if (!db || !user?.id || isAdmin()) return undefined;
    const q = query(
      collection(db, 'researcherMessages'),
      where('fromUserId', '==', user.id),
      where('researcherRead', '==', false)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => setUnreadMessages(snapshot.size),
      () => setUnreadMessages(0)
    );
    return () => unsubscribe();
  }, [user?.id, isAdmin]);

  return (
    <>
      {/* Menu Button */}
      <button 
        className={`menu-button ${isOpen ? 'active' : ''}`}
        onClick={toggleNav}
        aria-label={t('navToolbar', 'סרגל כלים')}
        type="button"
      >
        <span className="menu-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="nav-overlay" onClick={closeNav}></div>
      )}

      {/* Navigation Sidebar */}
      <nav className={`navigation-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <h2>{t('navToolbar', 'סרגל כלים')}</h2>
          <button className="close-button" onClick={closeNav} aria-label={t('close', 'סגור')} type="button">
            ✕
          </button>
        </div>
        <div className="nav-user-info">
          <div className="user-role-badge">
            {isAdmin() ? t('researchAuthority', 'רשות המחקר') : t('researcher', 'חוקר')}
          </div>
          {user && <div className="user-name">{user.name}</div>}
        </div>
        
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <button
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={handleNavigate(item.path)}
                type="button"
              >
                <span className="nav-label">
                  {item.label}
                  {item.path === '/notifications' && (unreadCount + unreadMessages) > 0 && (
                    <span style={{
                      marginRight: '8px',
                      background: '#e53e3e',
                      color: 'white',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {unreadCount + unreadMessages}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
        
        <div className="nav-footer">
          <button
            className="logout-button"
            onClick={handleNavigate('/login')}
            type="button"
          >
            <span className="nav-label">{t('logout', 'התנתק')}</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default NavigationBar;

