import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { notifyAdminPendingRegistration } from './notifications';

/** @typedef {'RESEARCHER' | 'ADMIN'} UserRole */
/** @typedef {'pending' | 'approved' | 'rejected'} AccountStatus */
/** @typedef {'email' | 'college_sso'} AuthProvider */

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {UserRole} role
 * @property {AccountStatus} accountStatus
 * @property {AuthProvider} authProvider
 * @property {string|null} rejectionReason
 * @property {import('firebase/firestore').Timestamp|null} createdAt
 * @property {import('firebase/firestore').Timestamp|null} approvedAt
 */

export const ACCOUNT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const USER_ROLES = {
  RESEARCHER: 'RESEARCHER',
  ADMIN: 'ADMIN',
};

const AUTH_ERROR_MESSAGES_HE = {
  'auth/invalid-email': 'כתובת אימייל לא תקינה',
  'auth/user-disabled': 'החשבון הושבת. פנו לרשות המחקר.',
  'auth/user-not-found': 'לא נמצא משתמש עם אימייל זה',
  'auth/wrong-password': 'סיסמה שגויה',
  'auth/invalid-credential': 'אימייל או סיסמה שגויים',
  'auth/email-already-in-use': 'כתובת האימייל כבר רשומה במערכת',
  'auth/rejected-reregister-password':
    'כתובת האימייל כבר קיימת. אם בקשת ההרשמה הקודמת נדחתה, השתמש/י באותה סיסמה או אפס/י סיסמה (שכחתי סיסמה) ולאחר מכן הירשם/י שוב.',
  'auth/weak-password': 'הסיסמה חלשה מדי (לפחות 6 תווים)',
  'auth/too-many-requests': 'יותר מדי ניסיונות. נסו שוב מאוחר יותר.',
  'auth/network-request-failed': 'בעיית רשת. בדקו את החיבור לאינטרנט.',
  'auth/requires-recent-login': 'נדרשת התחברות מחדש. נסו שוב.',
  'permission-denied':
    'אין הרשאה לעדכן את הפרופיל. עדכני את כללי Firestore (קובץ firestore.rules) ולחצי Publish ב-Firebase Console.',
};

const AUTH_ERROR_MESSAGES_EN = {
  'auth/invalid-email': 'Invalid email address',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email',
  'auth/wrong-password': 'Incorrect password',
  'auth/invalid-credential': 'Invalid email or password',
  'auth/email-already-in-use': 'This email is already registered',
  'auth/rejected-reregister-password':
    'This email already exists. If your previous registration was rejected, use the same password or reset your password, then register again.',
  'auth/weak-password': 'Password is too weak (at least 6 characters)',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/requires-recent-login': 'Please sign in again and retry.',
  'permission-denied':
    'Permission denied updating profile. Update Firestore rules (firestore.rules) and click Publish in Firebase Console.',
};

export function getAuthErrorMessage(error, lang = 'he') {
  if (error?.message === 'PROFILE_NOT_FOUND') {
    return lang === 'en'
      ? 'User profile not found in Firestore. Ensure the users document ID matches your Authentication UID.'
      : 'לא נמצא פרופיל משתמש ב-Firestore. ודאי שמזהה המסמך ב-users תואם ל-UID ב-Authentication.';
  }

  const code = error?.code || '';
  const table = lang === 'en' ? AUTH_ERROR_MESSAGES_EN : AUTH_ERROR_MESSAGES_HE;
  return table[code] || (lang === 'en' ? 'Authentication error. Please try again.' : 'שגיאת התחברות. אנא נסו שוב.');
}

function normalizeAccountStatus(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Load the Firestore user profile for a Firebase Auth UID.
 * @param {string} uid
 * @returns {Promise<UserProfile|null>}
 */
export async function fetchUserProfile(uid) {
  // Ensure the auth token is attached to Firestore requests (avoids race after sign-in)
  if (auth.currentUser) {
    await auth.currentUser.getIdToken();
  }

  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: uid,
    name: data.name || '',
    email: data.email || '',
    role: data.role || USER_ROLES.RESEARCHER,
    accountStatus: normalizeAccountStatus(
      data.accountStatus || data.accountStat || ACCOUNT_STATUS.PENDING
    ),
    authProvider: data.authProvider || 'email',
    rejectionReason: data.rejectionReason || null,
    createdAt: data.createdAt || null,
    approvedAt: data.approvedAt || null,
  };
}

async function recreateResearcherProfile(user, { name, email }) {
  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, 'users', user.uid), {
    name,
    email,
    role: USER_ROLES.RESEARCHER,
    accountStatus: ACCOUNT_STATUS.PENDING,
    authProvider: 'email',
    rejectionReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    approvedAt: null,
    approvedBy: null,
  });

  try {
    await notifyAdminPendingRegistration({
      userId: user.uid,
      name,
      email,
      isReapply: true,
    });
  } catch (e) {
    console.warn('Could not notify admin about re-registration:', e);
  }

  return fetchUserProfile(user.uid);
}

/**
 * Re-submit registration for a previously rejected account (same email in Firebase Auth).
 */
async function reapplyRejectedRegistration({ name, email, password }) {
  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, email, password);
  } catch (signInErr) {
    if (signInErr?.code === 'auth/invalid-credential' || signInErr?.code === 'auth/wrong-password') {
      const err = new Error('REJECTED_REREGISTER_PASSWORD');
      err.code = 'auth/rejected-reregister-password';
      throw err;
    }
    throw signInErr;
  }

  const { user } = credential;
  await user.getIdToken(true);

  const profile = await fetchUserProfile(user.uid);

  if (!profile) {
    return recreateResearcherProfile(user, { name, email });
  }

  if (profile.accountStatus === ACCOUNT_STATUS.APPROVED) {
    await firebaseSignOut(auth);
    const err = new Error('EMAIL_ALREADY_REGISTERED');
    err.code = 'auth/email-already-in-use';
    throw err;
  }

  if (profile.accountStatus === ACCOUNT_STATUS.PENDING) {
    await updateProfile(user, { displayName: name });
    return profile;
  }

  if (profile.accountStatus !== ACCOUNT_STATUS.REJECTED) {
    await firebaseSignOut(auth);
    const err = new Error('EMAIL_ALREADY_REGISTERED');
    err.code = 'auth/email-already-in-use';
    throw err;
  }

  await updateProfile(user, { displayName: name });

  try {
    await updateDoc(doc(db, 'users', user.uid), {
      name,
      accountStatus: ACCOUNT_STATUS.PENDING,
      rejectionReason: null,
      role: USER_ROLES.RESEARCHER,
      updatedAt: serverTimestamp(),
      approvedAt: null,
      approvedBy: null,
    });
  } catch (updateErr) {
    await firebaseSignOut(auth);
    if (updateErr?.code === 'permission-denied') {
      const err = new Error('PERMISSION_DENIED');
      err.code = 'permission-denied';
      throw err;
    }
    throw updateErr;
  }

  try {
    await notifyAdminPendingRegistration({
      userId: user.uid,
      name,
      email,
      isReapply: true,
    });
  } catch (e) {
    console.warn('Could not notify admin about re-registration:', e);
  }

  return fetchUserProfile(user.uid);
}

async function createNewResearcher({ name, email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = credential;

  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, 'users', user.uid), {
    name,
    email,
    role: USER_ROLES.RESEARCHER,
    accountStatus: ACCOUNT_STATUS.PENDING,
    authProvider: 'email',
    rejectionReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    approvedAt: null,
    approvedBy: null,
  });

  try {
    await sendEmailVerification(user);
  } catch (e) {
    console.warn('Email verification could not be sent:', e);
  }

  try {
    await notifyAdminPendingRegistration({
      userId: user.uid,
      name,
      email,
      isReapply: false,
    });
  } catch (e) {
    console.warn('Could not notify admin about new registration:', e);
  }

  return fetchUserProfile(user.uid);
}

/**
 * Register a new researcher. Account starts as pending until admin approval.
 * Rejected users can re-register with the same email (Firebase Auth account is reused).
 */
export async function registerResearcher({ name, email, password }) {
  try {
    return await createNewResearcher({ name, email, password });
  } catch (err) {
    if (err?.code === 'auth/email-already-in-use') {
      return reapplyRejectedRegistration({ name, email, password });
    }
    throw err;
  }
}

/**
 * Sign in with email/password and return the Firestore profile.
 */
export async function signInWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await fetchUserProfile(credential.user.uid);
  if (!profile) {
    await firebaseSignOut(auth);
    const err = new Error('PROFILE_NOT_FOUND');
    err.uid = credential.user.uid;
    throw err;
  }
  return profile;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Future: college website SSO via custom token or SAML/OIDC.
 * When the college portal is connected, implement token exchange here
 * and call signInWithCustomToken(auth, token).
 */
export async function signInWithCollegeSSO() {
  throw new Error('COLLEGE_SSO_NOT_AVAILABLE');
}

/** Admin: list users waiting for approval */
export async function fetchPendingUsers() {
  const q = query(
    collection(db, 'users'),
    where('accountStatus', '==', ACCOUNT_STATUS.PENDING)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
}

/** Admin: approve a pending user and assign role */
export async function approveUser(userId, role, adminId) {
  await updateDoc(doc(db, 'users', userId), {
    accountStatus: ACCOUNT_STATUS.APPROVED,
    role: role || USER_ROLES.RESEARCHER,
    approvedAt: serverTimestamp(),
    approvedBy: adminId,
    updatedAt: serverTimestamp(),
    rejectionReason: null,
  });
}

/** Admin: reject a pending user — deletes Firestore profile and Firebase Auth account */
export async function rejectUser(userId, _reason, _adminId) {
  if (auth.currentUser?.uid === userId) {
    const err = new Error('Cannot reject your own account');
    err.code = 'self-reject';
    throw err;
  }

  await deleteDoc(doc(db, 'users', userId));

  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    const err = new Error('NOT_AUTHENTICATED');
    err.code = 'auth/not-authenticated';
    throw err;
  }

  const base = (process.env.REACT_APP_REVIEW_API_BASE || '').trim().replace(/\/$/, '');
  const url = `${base}/api/auth/delete-user`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });
  } catch (networkErr) {
    const err = new Error('AUTH_DELETE_SERVER_UNAVAILABLE');
    err.code = 'auth-delete-server-unavailable';
    err.cause = networkErr;
    throw err;
  }

  if (res.ok) return;

  const body = await res.json().catch(() => ({}));

  if (res.status === 501) {
    const err = new Error('AUTH_DELETE_NOT_CONFIGURED');
    err.code = 'auth-delete-not-configured';
    throw err;
  }

  const err = new Error(body.error || 'Failed to delete Auth user');
  err.code = body.code || 'auth-delete-failed';
  throw err;
}

/** Admin: list all approved users */
export async function fetchAllUsers() {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
