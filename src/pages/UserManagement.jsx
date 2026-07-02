import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchPendingUsers,
  approveUser,
  rejectUser,
  USER_ROLES,
} from '../services/authService';
import './UserManagement.css';
import './Page.css';

const UserManagement = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState({});

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const users = await fetchPendingUsers();
      setPendingUsers(users);
      const roles = {};
      users.forEach((u) => {
        roles[u.id] = USER_ROLES.RESEARCHER;
      });
      setSelectedRoles(roles);
    } catch (err) {
      console.error(err);
      setError(t('userManagementLoadError', 'שגיאה בטעינת משתמשים'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleApprove = async (userId) => {
    setActionId(userId);
    try {
      await approveUser(userId, selectedRoles[userId] || USER_ROLES.RESEARCHER, user?.id);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError(t('userManagementActionError', 'שגיאה בביצוע הפעולה'));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (userId) => {
    const confirmed = window.confirm(
      t(
        'rejectUserConfirm',
        'לדחות את הבקשה ולמחוק את פרטי המשתמש? לאחר מכן יוכל/תוכל להירשם מחדש עם אותו אימייל.'
      )
    );
    if (!confirmed) return;

    setActionId(userId);
    try {
      await rejectUser(userId, null, user?.id);
      await loadUsers();
    } catch (err) {
      console.error(err);
      if (err?.code === 'auth-delete-not-configured') {
        setError(
          t(
            'authDeleteNotConfigured',
            'פרטי המשתמש נמחקו מ-Firestore, אך חשבון ההתחברות לא נמחק — הגדירי FIREBASE_SERVICE_ACCOUNT ב-server/.env והפעילי מחדש את השרת.'
          )
        );
      } else if (err?.code === 'auth-delete-server-unavailable') {
        setError(
          t(
            'authDeleteServerUnavailable',
            'פרטי המשתמש נמחקו מ-Firestore, אך השרת לא זמין למחיקת חשבון ההתחברות. הפעילי את השרת (npm run start:server).'
          )
        );
      } else {
        setError(t('userManagementActionError', 'שגיאה בביצוע הפעולה'));
      }
      await loadUsers();
    } finally {
      setActionId(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '—';
    return timestamp.toDate().toLocaleDateString('he-IL');
  };

  return (
    <div className="page-container">
      <div className="page-content user-management-page">
        <h1>{t('userManagementTitle', 'ניהול משתמשים')}</h1>
        <p className="user-management-subtitle">
          {t('userManagementSubtitle', 'אישור בקשות הרשמה של חוקרים חדשים')}
        </p>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <p>{t('loading', 'טוען...')}</p>
        ) : pendingUsers.length === 0 ? (
          <div className="info-message inline-info">
            {t('noPendingUsers', 'אין בקשות הרשמה ממתינות לאישור')}
          </div>
        ) : (
          <div className="user-management-table-wrap">
            <table className="user-management-table">
              <thead>
                <tr>
                  <th>{t('fullName', 'שם מלא')}</th>
                  <th>{t('email', 'אימייל')}</th>
                  <th>{t('registrationDate', 'תאריך הרשמה')}</th>
                  <th>{t('assignRole', 'תפקיד לאישור')}</th>
                  <th>{t('actions', 'פעולות')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || '—'}</td>
                    <td dir="ltr">{u.email}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <select
                        value={selectedRoles[u.id] || USER_ROLES.RESEARCHER}
                        onChange={(e) =>
                          setSelectedRoles((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        disabled={actionId === u.id}
                      >
                        <option value={USER_ROLES.RESEARCHER}>
                          {t('researcher', 'חוקר')}
                        </option>
                        <option value={USER_ROLES.ADMIN}>
                          {t('researchAuthority', 'רשות המחקר')}
                        </option>
                      </select>
                    </td>
                    <td className="user-actions-cell">
                      <button
                        type="button"
                        className="approve-btn"
                        onClick={() => handleApprove(u.id)}
                        disabled={actionId === u.id}
                      >
                        {t('approve', 'אשר')}
                      </button>
                      <button
                        type="button"
                        className="reject-btn"
                        onClick={() => handleReject(u.id)}
                        disabled={actionId === u.id}
                      >
                        {t('reject', 'דחה')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
