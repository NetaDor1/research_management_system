import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './NavigationBar.css';

const NavigationBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, user, userRole } = useAuth();

  const toggleNav = () => {
    setIsOpen(!isOpen);
  };

  const closeNav = () => {
    setIsOpen(false);
  };

  // Navigation items - filtered by role
  // RESEARCHER sees only Home, Dashboard, Statistics, and Report Format
  // ADMIN sees all items including Research, Patents, and Articles
  const allNavItems = [
    { path: '/', label: 'עמוד הבית' },
    { path: '/dashboard', label: 'לוח בקרה' },
    { path: '/research', label: 'מחקרים' },
    { path: '/patents', label: 'פטנטים' },
    { path: '/articles', label: 'מאמרים' },
    { path: '/statistics', label: 'סטטיסטיקות' },
    { path: '/report-format', label: 'פורמט דו"חות' },
  ];

  // Filter nav items based on role
  const navItems = isAdmin() 
    ? allNavItems 
    : allNavItems.filter(item => 
        item.path === '/' || 
        item.path === '/dashboard' || 
        item.path === '/statistics' || 
        item.path === '/report-format'
      );

  return (
    <>
      {/* Menu Button */}
      <button 
        className={`menu-button ${isOpen ? 'active' : ''}`}
        onClick={toggleNav}
        aria-label="סרגל כלים"
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
          <h2>סרגל כלים</h2>
          <button className="close-button" onClick={closeNav} aria-label="סגור">
            ✕
          </button>
        </div>
        <div className="nav-user-info">
          <div className="user-role-badge">
            {isAdmin() ? 'רשות המחקר' : 'חוקר'}
          </div>
          {user && <div className="user-name">{user.name}</div>}
        </div>
        
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <button
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => {
                  closeNav();
                  navigate(item.path);
                }}
              >
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        
        <div className="nav-footer">
          <button
            className="logout-button"
            onClick={() => {
              closeNav();
              navigate('/login');
            }}
          >
            <span className="nav-label">התנתק</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default NavigationBar;

