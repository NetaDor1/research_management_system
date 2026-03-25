import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './NavigationBar.css';

const NavigationBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, user, userRole } = useAuth();
  const { t } = useLanguage();

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
        item.path === '/settings'
      );

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

