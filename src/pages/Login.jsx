import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { setUser, setUserRole } = useAuth();
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'RESEARCHER' // Default role
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Basic validation
      if (!formData.email || !formData.password) {
        setError(t('fillAllFields', 'אנא מלא את כל השדות'));
        
        setLoading(false);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError(t('invalidEmail', 'כתובת אימייל לא תקינה'));
        setLoading(false);
        return;
      }

      // Simulate authentication (in a real app, this would call an API)
      // For now, we'll accept any email/password combination
      // In production, you should validate against Firebase Auth or your backend
      
      // Create user object based on role
      const userData = {
        id: formData.role === 'ADMIN' ? '1' : '2',
        name: formData.role === 'ADMIN' ? 'רשות המחקר' : 'חוקר',
        email: formData.email
      };

      // Set user and role in context (this will also save to localStorage)
      setUser(userData);
      setUserRole(formData.role);

      // Navigate to home page
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(t('loginError', 'שגיאה בהתחברות. אנא נסה שוב.'));
    } finally {
      setLoading(false);
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

          <div className="form-group">
            <span className="form-label">{t('role', 'תפקיד')}</span>
            <div className="role-options" role="radiogroup" aria-label={t('role', 'תפקיד')}>
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="RESEARCHER"
                  checked={formData.role === 'RESEARCHER'}
                  onChange={handleChange}
                  required
                />
                {t('researcher', 'חוקר')}
              </label>
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="ADMIN"
                  checked={formData.role === 'ADMIN'}
                  onChange={handleChange}
                  required
                />
                {t('researchAuthority', 'רשות המחקר')}
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? t('loggingIn', 'מתחבר...') : t('login', 'התחבר')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {t('forgotPassword', 'שכחת את הסיסמה?')}{' '}
            <a href="#" onClick={(e) => {
              e.preventDefault();
              alert('Password reset functionality will be added later');
            }}>
              {t('clickHere', 'לחץ כאן')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
