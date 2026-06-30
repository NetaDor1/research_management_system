import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  fetchUserProfile,
  signOut as authSignOut,
  ACCOUNT_STATUS,
  USER_ROLES,
} from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async (uid) => {
    const userProfile = await fetchUserProfile(uid);
    setProfile(userProfile);
    return userProfile;
  }, []);

  /** Call after signInWithEmailAndPassword so context is ready before navigate. */
  const establishSession = useCallback(async (userProfile) => {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    setFirebaseUser(fbUser);
    if (userProfile) {
      setProfile(userProfile);
    } else {
      await loadProfile(fbUser.uid);
    }
    setLoading(false);
    return userProfile ?? (await fetchUserProfile(fbUser.uid));
  }, [loadProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          await loadProfile(fbUser.uid);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          setProfile(null);
          if (err?.code === 'permission-denied') {
            console.error(
              'Firestore: publish firestore.rules from the project root in Firebase Console → Firestore → Rules'
            );
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    const uid = auth.currentUser?.uid ?? firebaseUser?.uid;
    if (!uid) return null;
    return loadProfile(uid);
  }, [firebaseUser, loadProfile]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setProfile(null);
    setFirebaseUser(null);
  }, []);

  const user = profile
    ? { id: profile.id, name: profile.name, email: profile.email }
    : null;

  const userRole = profile?.role || null;
  const accountStatus = profile?.accountStatus || null;

  const isAuthenticated = Boolean(firebaseUser && profile);
  const isApproved = accountStatus === ACCOUNT_STATUS.APPROVED;
  const isPending = accountStatus === ACCOUNT_STATUS.PENDING;
  const isRejected = accountStatus === ACCOUNT_STATUS.REJECTED;
  const isAdmin = () => userRole === USER_ROLES.ADMIN && isApproved;
  const isResearcher = () => userRole === USER_ROLES.RESEARCHER && isApproved;

  const value = {
    loading,
    firebaseUser,
    profile,
    user,
    userRole,
    accountStatus,
    isAuthenticated,
    isApproved,
    isPending,
    isRejected,
    isAdmin,
    isResearcher,
    refreshProfile,
    establishSession,
    signOut,
    // Legacy setters kept for compatibility during migration — no-ops in production
    setUser: () => {},
    setUserRole: () => {},
    isManager: () => isAdmin(),
    isLecturer: () => isResearcher(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
