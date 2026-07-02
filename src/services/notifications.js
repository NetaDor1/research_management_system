import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const createNotification = async ({
  userId,
  title,
  message,
  type = 'info',
  entityType = '',
  entityId = '',
  link = '',
  eventKey = '',
  targetRole = ''
}) => {
  if (!db || !userId) return null;

  const payload = {
    userId,
    title: title || '',
    message: message || '',
    type,
    entityType,
    entityId,
    link,
    eventKey,
    read: false,
    createdAt: serverTimestamp()
  };

  if (targetRole) payload.targetRole = targetRole;

  const docRef = await addDoc(collection(db, 'notifications'), payload);
  return docRef.id;
};

/** Notify research authority that a researcher is waiting for account approval */
export async function notifyAdminPendingRegistration({ userId, name, email, isReapply = false }) {
  const displayName = (name || '').trim() || 'חוקר';
  const displayEmail = (email || '').trim();

  return createNotification({
    userId: 'ADMIN',
    targetRole: 'ADMIN',
    title: isReapply ? 'בקשת הרשמה חוזרת' : 'בקשת הרשמה חדשה',
    message: isReapply
      ? `${displayName} (${displayEmail}) הגיש/ה בקשת הרשמה חוזרת וממתין/ה לאישור חשבון.`
      : `${displayName} (${displayEmail}) נרשם/ה למערכת וממתין/ה לאישור חשבון.`,
    type: 'user_registration_pending',
    entityType: 'user',
    entityId: userId,
    link: '/user-management',
    eventKey: `user_registration_pending:${userId}:${Date.now()}`,
  });
}
