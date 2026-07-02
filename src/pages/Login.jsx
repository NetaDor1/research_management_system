import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  signInWithEmail,
  signInWithCollegeSSO,
  getAuthErrorMessage,
  ACCOUNT_STATUS,
  signOut,
} from '../services/authService';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { establishSession } = useAuth();
  const { t, language } = useLanguage();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const routeAfterLogin = async (profile) => {
    if (profile.accountStatus === ACCOUNT_STATUS.PENDING) {
      navigate('/pending-approval');
      return;
    }
    if (profile.accountStatus === ACCOUNT_STATUS.REJECTED) {
      await signOut();
      setError(
        profile.rejectionReason
          ? `${t('loginRejected', 'בקשת ההרשמה נדחתה')}: ${profile.rejectionReason}`
          : t('loginRejected', 'בקשת ההרשמה נדחתה. פנו לרשות המחקר.')
      );
      return;
    }
    await establishSession(profile);
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        setError(t('fillAllFields', 'אנא מלא את כל השדות'));
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError(t('invalidEmail', 'כתובת אימייל לא תקינה'));
        return;
      }

      const profile = await signInWithEmail(formData.email.trim(), formData.password);
      await routeAfterLogin(profile);
    } catch (err) {
      if (err.message === 'PROFILE_NOT_FOUND') {
        setError(t('accountNotFoundLogin', 'בקשת ההרשמה שלך נדחתה. יש ליצור את החשבון מחדש.'));
      } else if (err?.code === 'permission-denied') {
        setError(
          t(
            'firestorePermissionDenied',
            'אין הרשאה לקרוא את פרופיל המשתמש. עדכני את כללי Firestore (ראי firestore.rules בפרויקט) ולחצי Publish ב-Firebase Console.'
          )
        );
      } else {
        setError(getAuthErrorMessage(err, language));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCollegeSSO = async () => {
    setError('');
    try {
      await signInWithCollegeSSO();
    } catch {
      setError(t('collegeSsoNotAvailable', 'כניסה דרך אתר המכללה תהיה זמינה בעתיד.'));
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>{t('loginTitle', 'התחברות למערכת')}</h1>
          <p>{t('welcome', 'ברוכים הבאים למערכת ניהול מחקר')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">{t('email', 'כתובת אימייל')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('enterEmail', 'הכנס כתובת אימייל')}
              required
              autoComplete="email"
              dir="ltr"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('password', 'סיסמה')}</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('enterPassword', 'הכנס סיסמה')}
                required
                autoComplete="current-password"
                dir="ltr"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('hidePassword', 'הסתר סיסמה') : t('showPassword', 'הצג סיסמה')}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? t('loggingIn', 'מתחבר...') : t('login', 'התחבר')}
          </button>
        </form>

        <button
          type="button"
          className="college-sso-button"
          onClick={handleCollegeSSO}
          title={t('collegeSsoHint', 'יתחבר בעתיד לאתר המכללה')}
        >
          {t('collegeSsoLogin', 'כניסה דרך אתר המכללה')}
          <span className="coming-soon-badge">{t('comingSoon', 'בקרוב')}</span>
        </button>

        <div className="login-footer">
          <p>
            {t('forgotPassword', 'שכחת את הסיסמה?')}{' '}
            <Link to="/forgot-password">{t('clickHere', 'לחץ כאן')}</Link>
          </p>
          <p>
            {t('noAccount', 'אין לך חשבון?')}{' '}
            <Link to="/register">{t('registerHere', 'הירשם כאן')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
