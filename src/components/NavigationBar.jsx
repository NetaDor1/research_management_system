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

  // Admin: unread messages from researchers + unread replies on admin-sent messages
  useEffect(() => {
    if (!db || !isAdmin()) return undefined;

    // Researcher→admin messages not yet read by admin
    const qReceived = query(collection(db, 'researcherMessages'), where('read', '==', false));
    // Admin→researcher messages where researcher has replied and admin hasn't read the reply
    const qSentReplied = query(
      collection(db, 'researcherMessages'),
      where('fromAdmin', '==', true),
      where('researcherRead', '==', false)
    );

    let receivedCount = 0;
    let repliedCount = 0;
    const update = () => setUnreadMessages(receivedCount + repliedCount);

    const unsubReceived = onSnapshot(qReceived, (snap) => {
      receivedCount = snap.docs.filter((d) => d.data().fromAdmin !== true).length;
      update();
    }, () => {});
    const unsubReplied = onSnapshot(qSentReplied, (snap) => {
      // Only count those that actually have replies
      repliedCount = snap.docs.filter((d) => (d.data().replies || []).length > 0).length;
      update();
    }, () => {});

    return () => { unsubReceived(); unsubReplied(); };
  }, [isAdmin]);

  // Researcher: unread admin replies in outbox + unread incoming messages from admin
  useEffect(() => {
    if (!db || !user?.id || isAdmin()) return undefined;
    const qOutbox = query(
      collection(db, 'researcherMessages'),
      where('fromUserId', '==', user.id),
      where('researcherRead', '==', false)
    );
    const qIncoming = query(
      collection(db, 'researcherMessages'),
      where('fromAdmin', '==', true),
      where('toUserId', '==', user.id),
      where('read', '==', false)
    );
    let outboxCount = 0;
    let incomingCount = 0;
    const update = () => setUnreadMessages(outboxCount + incomingCount);
    const unsubOutbox = onSnapshot(qOutbox, (s) => { outboxCount = s.size; update(); }, () => {});
    const unsubIncoming = onSnapshot(qIncoming, (s) => { incomingCount = s.size; update(); }, () => {});
    return () => { unsubOutbox(); unsubIncoming(); };
  }, [user?.id, isAdmin]);

  const totalUnread = unreadCount + unreadMessages;

  return (
    <>
      {/* Bell Button */}
      <button
        className="bell-button"
        onClick={handleNavigate('/notifications')}
        aria-label="התראות"
        type="button"
      >
        <span style={{ fontSize: '22px', lineHeight: 1 }}>🔔</span>
        {totalUnread > 0 && (
          <span className="bell-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
        )}
      </button>

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
                <span className="nav-label">{item.label}</span>
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

