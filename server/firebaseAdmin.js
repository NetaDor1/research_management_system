const path = require('path');
const fs = require('fs');

let initialized = false;
let admin = null;

function getFirebaseAdmin() {
  if (initialized) return admin;

  initialized = true;

  try {
    // eslint-disable-next-line global-require
    admin = require('firebase-admin');
  } catch {
    console.warn('[firebase-admin] package not installed — user Auth deletion disabled');
    admin = null;
    return null;
  }

  const projectId =
    (process.env.FIREBASE_PROJECT_ID || 'research-management-syst-11bea').trim();
  const jsonRaw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  const jsonPath = (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();

  try {
    if (jsonRaw) {
      const serviceAccount = JSON.parse(jsonRaw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      return admin;
    }

    if (jsonPath) {
      const resolved = path.isAbsolute(jsonPath)
        ? jsonPath
        : path.join(__dirname, jsonPath);
      const serviceAccount = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      return admin;
    }

    console.warn(
      '[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH not set — user Auth deletion disabled'
    );
    admin = null;
    return null;
  } catch (err) {
    console.error('[firebase-admin] init failed:', err.message);
    admin = null;
    return null;
  }
}

module.exports = { getFirebaseAdmin };
