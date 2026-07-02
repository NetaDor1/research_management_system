const express = require('express');
const { getFirebaseAdmin } = require('./firebaseAdmin');

const router = express.Router();

async function verifyApprovedAdmin(idToken) {
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    const err = new Error('Firebase Admin is not configured on the server');
    err.statusCode = 501;
    err.code = 'ADMIN_SDK_NOT_CONFIGURED';
    throw err;
  }

  const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
  const callerSnap = await firebaseAdmin
    .firestore()
    .collection('users')
    .doc(decoded.uid)
    .get();

  if (!callerSnap.exists) {
    const err = new Error('Caller profile not found');
    err.statusCode = 403;
    throw err;
  }

  const caller = callerSnap.data();
  if (caller.role !== 'ADMIN' || caller.accountStatus !== 'approved') {
    const err = new Error('Only approved admins can delete users');
    err.statusCode = 403;
    throw err;
  }

  return decoded;
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

/**
 * Delete a rejected/pending user's Firebase Auth account (Firestore doc deleted by client).
 * POST /api/auth/delete-user  { userId }
 */
router.post('/delete-user', async (req, res, next) => {
  try {
    const idToken = getBearerToken(req);
    if (!idToken) {
      return res.status(401).json({ error: 'Missing Authorization token', code: 'UNAUTHORIZED' });
    }

    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId', code: 'INVALID_REQUEST' });
    }

    const adminCaller = await verifyApprovedAdmin(idToken);
    if (userId === adminCaller.uid) {
      return res.status(400).json({ error: 'Cannot delete your own account', code: 'SELF_DELETE' });
    }

    const firebaseAdmin = getFirebaseAdmin();

    try {
      await firebaseAdmin.auth().deleteUser(userId);
    } catch (authErr) {
      if (authErr?.code !== 'auth/user-not-found') {
        throw authErr;
      }
    }

    // Ensure Firestore profile is gone even if client delete failed earlier
    try {
      await firebaseAdmin.firestore().collection('users').doc(userId).delete();
    } catch (firestoreErr) {
      console.warn('[delete-user] Firestore delete:', firestoreErr.message);
    }

    return res.json({ ok: true, userId });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
