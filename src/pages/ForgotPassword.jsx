import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { resetPassword, getAuthErrorMessage } from '../services/authService';
import './Login.css';

const ForgotPassword = () => {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      if (!email.trim()) {
        setError(t('fillAllFields', 'אנא מלא את כל השדות'));
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError(t('invalidEmail', 'כתובת אימייל לא תקינה'));
        return;
      }

      await resetPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(getAuthErrorMessage(err, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>{t('forgotPasswordTitle', 'איפוס סיסמה')}</h1>
          <p>{t('forgotPasswordSubtitle', 'הזינו את כתובת האימייל ונשלח לכם קישור לאיפוס')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message" role="alert">{error}</div>}
          {success && (
            <div className="success-message" role="status">
              {t('resetEmailSent', 'נשלח אימייל עם קישור לאיפוס הסיסמה. בדקו את תיבת הדואר.')}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">{t('email', 'כתובת אימייל')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('enterEmail', 'הכנס כתובת אימייל')}
              required
              autoComplete="email"
              dir="ltr"
            />
          </div>

          <button type="submit" className="login-button" disabled={loading || success}>
            {loading ? t('sending', 'שולח...') : t('sendResetLink', 'שלח קישור לאיפוס')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            <Link to="/login">{t('backToLogin', 'חזרה להתחברות')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
