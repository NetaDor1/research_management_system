import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GuestRoute = ({ children }) => {
  const { loading, isApproved, isPending } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (isApproved) {
    return <Navigate to="/" replace />;
  }

  if (isPending) {
    return <Navigate to="/pending-approval" replace />;
  }

  return children;
};

export default GuestRoute;
