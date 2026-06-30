import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Login.css';

const PendingApproval = () => {
  const { isPending, isApproved, isAuthenticated, refreshProfile, signOut, profile } = useAuth();
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

  if (!isPending) return null;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>{t('pendingApprovalTitle', 'ממתין לאישור')}</h1>
        </div>

        <div className="info-message">
          {justRegistered ? (
            <p>{t('pendingApprovalRegistered', 'ההרשמה הושלמה בהצלחה! נשלח אימייל לאימות כתובת הדואר.')}</p>
          ) : null}
          <p>
            {t(
              'pendingApprovalBody',
              'חשבונך ממתין לאישור רשות המחקר. לאחר האישור תוכל/י להיכנס למערכת ולהשתמש בכל הפונקציות.'
            )}
          </p>
          {profile?.email && (
            <p className="pending-email">
              {t('registeredAs', 'נרשמת כ')}: <strong dir="ltr">{profile.email}</strong>
            </p>
          )}
        </div>

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
