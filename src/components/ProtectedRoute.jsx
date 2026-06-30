import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'approved'|'pending'|'admin'} [props.require]
 */
const ProtectedRoute = ({ children, require = 'approved' }) => {
  const { loading, isAuthenticated, isApproved, isPending, isRejected, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (require === 'pending') {
    if (isApproved) return <Navigate to="/" replace />;
    if (isRejected) return <Navigate to="/login" replace />;
    return children;
  }

  if (isPending) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (isRejected) {
    return <Navigate to="/login" replace />;
  }

  if (require === 'admin' && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  if (!isApproved) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
