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
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { auth, db } from './firebase';

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
  'auth/weak-password': 'הסיסמה חלשה מדי (לפחות 6 תווים)',
  'auth/too-many-requests': 'יותר מדי ניסיונות. נסו שוב מאוחר יותר.',
  'auth/network-request-failed': 'בעיית רשת. בדקו את החיבור לאינטרנט.',
};

const AUTH_ERROR_MESSAGES_EN = {
  'auth/invalid-email': 'Invalid email address',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email',
  'auth/wrong-password': 'Incorrect password',
  'auth/invalid-credential': 'Invalid email or password',
  'auth/email-already-in-use': 'This email is already registered',
  'auth/weak-password': 'Password is too weak (at least 6 characters)',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

export function getAuthErrorMessage(error, lang = 'he') {
  const code = error?.code || '';
  const table = lang === 'en' ? AUTH_ERROR_MESSAGES_EN : AUTH_ERROR_MESSAGES_HE;
  return table[code] || (lang === 'en' ? 'Authentication error. Please try again.' : 'שגיאת התחברות. אנא נסו שוב.');
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
    accountStatus:
      data.accountStatus
      || data.accountStat
      || ACCOUNT_STATUS.PENDING,
    authProvider: data.authProvider || 'email',
    rejectionReason: data.rejectionReason || null,
    createdAt: data.createdAt || null,
    approvedAt: data.approvedAt || null,
  };
}

/**
 * Register a new researcher. Account starts as pending until admin approval.
 */
export async function registerResearcher({ name, email, password }) {
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

  return fetchUserProfile(user.uid);
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

/** Admin: reject a pending user */
export async function rejectUser(userId, reason, adminId) {
  await updateDoc(doc(db, 'users', userId), {
    accountStatus: ACCOUNT_STATUS.REJECTED,
    rejectionReason: reason || null,
    updatedAt: serverTimestamp(),
    approvedBy: adminId,
  });
}

/** Admin: list all approved users */
export async function fetchAllUsers() {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
