import React, { useState } from 'react';
import { initializeFirebaseCollections, createUserDocument } from '../utils/initializeFirebase';
import { useLanguage } from '../context/LanguageContext';
import './Page.css';

const SetupFirebase = () => {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const [userData, setUserData] = useState({
    uid: '',
    name: '',
    email: '',
    role: 'RESEARCHER'
  });

  const handleInitialize = async () => {
    setLoading(true);
    setStatus('מאתחל...');
    
    const result = await initializeFirebaseCollections();
    
    if (result.success) {
      setStatus('✅ האתחול הושלם בהצלחה! בדקי את הקונסול לפרטים נוספים.');
    } else {
      setStatus(`❌ שגיאה: ${result.error}`);
    }
    
    setLoading(false);
  };

  const handleCreateUser = async () => {
    if (!userData.uid || !userData.name || !userData.email) {
      setStatus('❌ יש למלא את כל השדות');
      return;
    }

    setLoading(true);
    setStatus('יוצר משתמש...');
    
    const result = await createUserDocument(userData.uid, {
      name: userData.name,
      email: userData.email,
      role: userData.role
    });
    
    if (result.success) {
      setStatus('✅ משתמש נוצר בהצלחה!');
      setUserData({ uid: '', name: '', email: '', role: 'RESEARCHER' });
    } else {
      setStatus(`❌ שגיאה: ${result.error}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>{t('setupFirebase', 'הגדרת Firebase')}</h1>
        <p className="welcome-text">
          עמוד זה מאפשר לך לאתחל את מבנה ה-Collections ב-Firebase
        </p>

        <div className="form-section">
          <h2>1. אתחול Collections</h2>
          <p>לחצי על הכפתור כדי לראות את מבנה ה-Collections בקונסול</p>
          <button
            onClick={handleInitialize}
            disabled={loading}
            className="btn-submit"
            style={{ marginTop: '10px' }}
          >
            {loading ? 'מאתחל...' : 'אתחל Collections'}
          </button>
        </div>

        <div className="form-section">
          <h2>2. יצירת משתמש ב-Firestore</h2>
          <p>לאחר יצירת משתמש ב-Firebase Authentication, צרי את המסמך שלו כאן:</p>
          
          <div className="form-group">
            <label>UID (מ-Firebase Authentication)</label>
            <input
              type="text"
              value={userData.uid}
              onChange={(e) => setUserData({ ...userData, uid: e.target.value })}
              placeholder="הזיני את ה-UID של המשתמש"
            />
          </div>

          <div className="form-group">
            <label>שם</label>
            <input
              type="text"
              value={userData.name}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              placeholder="שם המשתמש"
            />
          </div>

          <div className="form-group">
            <label>אימייל</label>
            <input
              type="email"
              value={userData.email}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
              placeholder="אימייל"
            />
          </div>

          <div className="form-group">
            <label>תפקיד</label>
            <select
              value={userData.role}
              onChange={(e) => setUserData({ ...userData, role: e.target.value })}
            >
              <option value="RESEARCHER">חוקר (RESEARCHER)</option>
              <option value="ADMIN">רשות המחקר (ADMIN)</option>
            </select>
          </div>

          <button
            onClick={handleCreateUser}
            disabled={loading}
            className="btn-submit"
          >
            {loading ? 'יוצר...' : 'צור משתמש'}
          </button>
        </div>

        {status && (
          <div className="form-section">
            <div style={{
              padding: '15px',
              background: status.includes('✅') ? '#d4edda' : '#f8d7da',
              border: `2px solid ${status.includes('✅') ? '#28a745' : '#dc3545'}`,
              borderRadius: '8px',
              color: status.includes('✅') ? '#155724' : '#721c24'
            }}>
              {status}
            </div>
          </div>
        )}

        <div className="form-section">
          <h2>הוראות</h2>
          <ol style={{ lineHeight: '2', direction: 'rtl', textAlign: 'right' }}>
            <li>פתחי Firebase Console → Firestore Database</li>
            <li>צרי את ה-Collections הבאים: <strong>users</strong>, <strong>researchProposals</strong>, <strong>patents</strong>, <strong>articles</strong></li>
            <li>עברי ל-"Rules" והדבקי את ה-Security Rules (ראה קובץ firestore.rules)</li>
            <li>צרי משתמשים ב-Authentication</li>
            <li>השתמשי בטופס למעלה כדי ליצור מסמכי משתמשים ב-Firestore</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SetupFirebase;

