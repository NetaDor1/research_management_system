import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { registerResearcher, getAuthErrorMessage } from '../services/authService';
import './Login.css';

const Register = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { name, email, password, confirmPassword } = formData;

      if (!name.trim() || !email.trim() || !password || !confirmPassword) {
        setError(t('fillAllFields', 'אנא מלא את כל השדות'));
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError(t('invalidEmail', 'כתובת אימייל לא תקינה'));
        return;
      }

      if (password.length < 6) {
        setError(t('passwordTooShort', 'הסיסמה חייבת להכיל לפחות 6 תווים'));
        return;
      }

      if (password !== confirmPassword) {
        setError(t('passwordMismatch', 'הסיסמאות אינן תואמות'));
        return;
      }

      await registerResearcher({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      navigate('/pending-approval', { state: { justRegistered: true } });
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
          <h1>{t('registerTitle', 'הרשמה למערכת')}</h1>
          <p>{t('registerSubtitle', 'הרשמה לחוקרים חדשים — לאחר אישור רשות המחקר תוכלו להיכנס')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">{t('fullName', 'שם מלא')}</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('enterFullName', 'הכנס שם מלא')}
              required
              autoComplete="name"
            />
          </div>

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
                autoComplete="new-password"
                dir="ltr"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('confirmPassword', 'אימות סיסמה')}</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder={t('confirmPasswordPlaceholder', 'הכנס סיסמה שוב')}
              required
              autoComplete="new-password"
              dir="ltr"
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? t('registering', 'נרשם...') : t('register', 'הירשם')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {t('alreadyHaveAccount', 'כבר יש לך חשבון?')}{' '}
            <Link to="/login">{t('login', 'התחבר')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
