import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // TODO: Replace with actual authentication logic
  // For now, default to 'ADMIN' - can be changed to 'RESEARCHER'
  // Roles: 'ADMIN' (רשות המחקר) or 'RESEARCHER' (חוקר/מרצה)
  const [userRole, setUserRole] = useState('ADMIN'); // 'ADMIN' or 'RESEARCHER'
  const [user, setUser] = useState({
    id: '1',
    name: 'נטע דור',
    email: 'admin@college.ac.il'
  }); // Mock user - TODO: Replace with actual user from authentication

  const isAdmin = () => userRole === 'ADMIN';
  const isResearcher = () => userRole === 'RESEARCHER';

  // For backward compatibility (deprecated - use isAdmin/isResearcher instead)
  const isManager = () => userRole === 'ADMIN';
  const isLecturer = () => userRole === 'RESEARCHER';

  const value = {
    user,
    userRole,
    setUser,
    setUserRole,
    isAdmin,
    isResearcher,
    // Deprecated - keeping for backward compatibility
    isManager,
    isLecturer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

