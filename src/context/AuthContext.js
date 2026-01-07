import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Load user data from localStorage
const loadUserFromStorage = () => {
  try {
    const storedUser = localStorage.getItem('auth_user');
    const storedRole = localStorage.getItem('auth_role');
    
    if (storedUser && storedRole) {
      return {
        user: JSON.parse(storedUser),
        role: storedRole
      };
    }
  } catch (error) {
    console.error('Error loading user from storage:', error);
  }
  
  // Default values
  return {
    user: {
      id: '1',
      name: 'רשות המחקר',
      email: 'admin@college.ac.il'
    },
    role: 'ADMIN'
  };
};

export const AuthProvider = ({ children }) => {
  // Load initial state from localStorage
  const { user: initialUser, role: initialRole } = loadUserFromStorage();
  
  const [userRole, setUserRole] = useState(initialRole);
  const [user, setUser] = useState(initialUser);

  // Save to localStorage whenever user or role changes
  useEffect(() => {
    try {
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_role', userRole);
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  }, [user, userRole]);

  // Update user role function that also saves to localStorage
  const updateUserRole = (newRole) => {
    setUserRole(newRole);
    localStorage.setItem('auth_role', newRole);
  };

  // Update user function that also saves to localStorage
  const updateUser = (newUser) => {
    setUser(newUser);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
  };

  const isAdmin = () => userRole === 'ADMIN';
  const isResearcher = () => userRole === 'RESEARCHER';

  // For backward compatibility (deprecated - use isAdmin/isResearcher instead)
  const isManager = () => userRole === 'ADMIN';
  const isLecturer = () => userRole === 'RESEARCHER';

  const value = {
    user,
    userRole,
    setUser: updateUser,
    setUserRole: updateUserRole,
    isAdmin,
    isResearcher,
    // Deprecated - keeping for backward compatibility
    isManager,
    isLecturer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

