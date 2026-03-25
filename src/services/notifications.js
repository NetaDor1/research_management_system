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
  eventKey = ''
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

  const docRef = await addDoc(collection(db, 'notifications'), payload);
  return docRef.id;
};
