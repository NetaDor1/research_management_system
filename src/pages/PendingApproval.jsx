import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Login.css';

const PendingApproval = () => {
  const { loading, isPending, isApproved, isAuthenticated, refreshProfile, signOut, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.justRegistered;

  useEffect(() => {
    if (isApproved) {
      navigate('/');
    }
  }, [isApproved, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Poll for approval every 30 seconds
  useEffect(() => {
    if (!isPending) return undefined;
    const interval = setInterval(() => {
      refreshProfile();
    }, 30000);
    return () => clearInterval(interval);
  }, [isPending, refreshProfile]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="auth-loading-screen">
          <div className="auth-loading-spinner" />
        </div>
      </div>
    );
  }

  if (!isPending) return null;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>
            {justRegistered
              ? t('pendingApprovalRegisteredTitle', 'ההרשמה הושלמה בהצלחה!')
              : t('pendingApprovalTitle', 'ממתין לאישור')}
          </h1>
        </div>

        {justRegistered ? (
          <div className="success-message" role="status">
            <p>
              {t(
                'pendingApprovalAccountOpens',
                'החשבון שלך ייפתח לאחר אישור החשבון על ידי רשות המחקר.'
              )}
            </p>
            <p>
              {t(
                'pendingApprovalAfterApproval',
                'לאחר האישור תוכל/י להיכנס למערכת עם האימייל והסיסמה שבחרת.'
              )}
            </p>
          </div>
        ) : (
          <div className="info-message">
            <p>
              {t(
                'pendingApprovalBody',
                'חשבונך ממתין לאישור רשות המחקר. החשבון ייפתח לאחר אישור החשבון על ידי רשות המחקר.'
              )}
            </p>
          </div>
        )}

        {profile?.email && (
          <p className="pending-email">
            {t('registeredAs', 'נרשמת כ')}: <strong dir="ltr">{profile.email}</strong>
          </p>
        )}

        <button type="button" className="login-button secondary-button" onClick={() => refreshProfile()}>
          {t('checkApprovalStatus', 'בדוק שוב את סטטוס האישור')}
        </button>

        <button type="button" className="login-button logout-link-button" onClick={handleLogout}>
          {t('logout', 'התנתק')}
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
