import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sanitizeStorageFileName } from './fileDownload';

export const REQUIRED_DOCUMENT_KEYS = [
  'docCV',
  'docAbstract',
  'docRecommendationLetter',
  'docEthicsApproval',
  'docDetailedBudget',
  'docPartnerDocs',
  'docInstitutionalApproval',
];

export const REQUIRED_DOCUMENT_FALLBACKS = {
  docCV: 'קורות חיים',
  docAbstract: 'תקציר המחקר',
  docRecommendationLetter: 'מכתב המלצה',
  docEthicsApproval: 'אישור אתיקה',
  docDetailedBudget: 'תקציב מפורט',
  docPartnerDocs: 'מסמכי שותפים',
  docInstitutionalApproval: 'אישור מוסדי',
};

const REQUIRED_DOCUMENT_LABELS = {
  docCV: { he: 'קורות חיים', en: 'CV / Curriculum Vitae' },
  docAbstract: { he: 'תקציר המחקר', en: 'Research Abstract' },
  docRecommendationLetter: { he: 'מכתב המלצה', en: 'Letter of Recommendation' },
  docEthicsApproval: { he: 'אישור אתיקה', en: 'Ethics Approval' },
  docDetailedBudget: { he: 'תקציב מפורט', en: 'Detailed Budget' },
  docPartnerDocs: { he: 'מסמכי שותפים', en: 'Partner Documents' },
  docInstitutionalApproval: { he: 'אישור מוסדי', en: 'Institutional Approval' },
};

const STORED_KEY_TO_DOC_KEY = (() => {
  const map = new Map();
  for (const key of REQUIRED_DOCUMENT_KEYS) {
    map.set(key, key);
    const labels = REQUIRED_DOCUMENT_LABELS[key];
    if (labels?.he) map.set(labels.he, key);
    if (labels?.en) map.set(labels.en, key);
  }
  return map;
})();

export const resolveRequiredDocumentKey = (storedKey) =>
  STORED_KEY_TO_DOC_KEY.get(storedKey) || storedKey;

export const buildRequiredDocumentMeta = (fileItem) => {
  if (!fileItem || fileItem instanceof File || !fileItem.url) return null;
  return {
    name: fileItem.name || fileItem.fileName || 'file',
    url: fileItem.url,
    storagePath: fileItem.storagePath || '',
    uploadedAt: fileItem.uploadedAt || null,
  };
};

export const normalizeRequiredDocumentsFiles = (stored = {}) => {
  const files = {};
  for (const [storedKey, entries] of Object.entries(stored)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const docKey = resolveRequiredDocumentKey(storedKey);
    files[docKey] = [...(files[docKey] || []), ...entries];
  }
  return files;
};

export const toPersistedRequiredDocumentsMap = (stored = {}) => {
  const normalized = normalizeRequiredDocumentsFiles(stored);
  const result = {};
  for (const [docKey, entries] of Object.entries(normalized)) {
    const persisted = (entries || [])
      .map(buildRequiredDocumentMeta)
      .filter(Boolean);
    if (persisted.length > 0) {
      result[docKey] = persisted;
    }
  }
  return result;
};

export const normalizeRequiredDocumentsChecklist = (stored = {}) => {
  const checklist = {};
  for (const [storedKey, checked] of Object.entries(stored)) {
    if (!checked) continue;
    checklist[resolveRequiredDocumentKey(storedKey)] = true;
  }
  return checklist;
};

export const buildRequiredDocumentsChecklist = (filesMap = {}) =>
  REQUIRED_DOCUMENT_KEYS.reduce((acc, docKey) => {
    acc[docKey] = (filesMap[docKey] || []).length > 0;
    return acc;
  }, {});

export const uploadRequiredDocumentFile = async ({ storage, proposalId, docKey, file }) => {
  const safeFileName = sanitizeStorageFileName(file.name);
  const storagePath = `researchProposals/${proposalId}/required/${docKey}/${Date.now()}-${safeFileName}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file, {
    contentType: file.type || 'application/octet-stream',
    contentDisposition: `attachment; filename="${safeFileName}"`,
  });
  const url = await getDownloadURL(fileRef);
  return buildRequiredDocumentMeta({
    name: file.name,
    url,
    storagePath,
    uploadedAt: new Date().toISOString(),
  });
};

export const buildRequiredDocumentsFilesUrls = async ({
  formFiles = {},
  previousFiles = {},
  docKeys = REQUIRED_DOCUMENT_KEYS,
  proposalId,
  storage,
}) => {
  const result = {};

  for (const docKey of docKeys) {
    const formEntries = formFiles[docKey];
    const previousEntries = previousFiles[docKey] || [];

    if (formEntries === undefined) {
      if (previousEntries.length > 0) {
        result[docKey] = previousEntries
          .map(buildRequiredDocumentMeta)
          .filter(Boolean);
      }
      continue;
    }

    if (!formEntries.length) {
      result[docKey] = [];
      continue;
    }

    const uploadedOrExisting = [];
    for (let idx = 0; idx < formEntries.length; idx++) {
      const fileItem = formEntries[idx];
      const existingMeta = buildRequiredDocumentMeta(fileItem);
      if (existingMeta) {
        uploadedOrExisting.push(existingMeta);
        continue;
      }

      if (fileItem instanceof File) {
        const meta = await uploadRequiredDocumentFile({
          storage,
          proposalId,
          docKey,
          file: fileItem,
        });
        if (meta) uploadedOrExisting.push(meta);
      }
    }

    result[docKey] = uploadedOrExisting;
  }

  return result;
};
