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

  // Navigation items - both ADMIN and RESEARCHER see all items
  // The content will be filtered based on role in each page
  const navItems = [
    { path: '/', label: 'עמוד הבית', icon: '🏠' },
    { path: '/dashboard', label: 'לוח בקרה', icon: '📊' },
    { path: '/research', label: 'מחקרים', icon: '🔬' },
    { path: '/patents', label: 'פטנטים', icon: '📜' },
    { path: '/articles', label: 'מאמרים', icon: '📄' },
    { path: '/statistics', label: 'סטטיסטיקות', icon: '📈' },
    { path: '/report-format', label: 'פורמט דו"חות', icon: '📋' },
  ];

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
            {isAdmin() ? '👤 רשות המחקר' : '🔬 חוקר'}
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
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};

export default NavigationBar;

