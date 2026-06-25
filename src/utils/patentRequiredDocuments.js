import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sanitizeStorageFileName } from './fileDownload';

export const PATENT_REQUIRED_DOCUMENT_DEFS = [
  { labelKey: 'patentDocApplication', fallback: 'מסמך הבקשה לפטנט' },
  { labelKey: 'patentDocInstitutional', fallback: 'אישור מוסדי' },
  { labelKey: 'patentDocPartnersAgreement', fallback: 'הסכם שותפים' },
  { labelKey: 'patentDocDetailedBudget', fallback: 'תקציב מפורט' },
  { labelKey: 'patentDocRegistration', fallback: 'מסמכי רישום' },
  { labelKey: 'patentDocPayment', fallback: 'אישורי תשלום' },
];

export const PATENT_REQUIRED_DOCUMENT_KEYS = PATENT_REQUIRED_DOCUMENT_DEFS.map(
  (item) => item.labelKey
);

const PATENT_DOCUMENT_LABELS = {
  patentDocApplication: { he: 'מסמך הבקשה לפטנט', en: 'Patent application document' },
  patentDocInstitutional: { he: 'אישור מוסדי', en: 'Institutional approval' },
  patentDocPartnersAgreement: { he: 'הסכם שותפים', en: 'Partners agreement' },
  patentDocDetailedBudget: { he: 'תקציב מפורט', en: 'Detailed budget' },
  patentDocRegistration: { he: 'מסמכי רישום', en: 'Registration documents' },
  patentDocPayment: { he: 'אישורי תשלום', en: 'Payment confirmations' },
};

const STORED_KEY_TO_DOC_KEY = (() => {
  const map = new Map();
  for (const { labelKey, fallback } of PATENT_REQUIRED_DOCUMENT_DEFS) {
    map.set(labelKey, labelKey);
    map.set(fallback, labelKey);
    const labels = PATENT_DOCUMENT_LABELS[labelKey];
    if (labels?.he) map.set(labels.he, labelKey);
    if (labels?.en) map.set(labels.en, labelKey);
  }
  return map;
})();

export const resolvePatentDocumentKey = (storedKey) =>
  STORED_KEY_TO_DOC_KEY.get(storedKey) || storedKey;

export const buildPatentDocumentMeta = (fileItem) => {
  if (!fileItem || fileItem instanceof File || !fileItem.url) return null;
  return {
    name: fileItem.name || fileItem.fileName || 'file',
    url: fileItem.url,
    storagePath: fileItem.storagePath || '',
    uploadedAt: fileItem.uploadedAt || null,
  };
};

export const normalizePatentDocumentsFiles = (stored = {}) => {
  const files = {};
  for (const [storedKey, entries] of Object.entries(stored)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const docKey = resolvePatentDocumentKey(storedKey);
    files[docKey] = [...(files[docKey] || []), ...entries];
  }
  return files;
};

export const toPersistedPatentDocumentsMap = (stored = {}) => {
  const normalized = normalizePatentDocumentsFiles(stored);
  const result = {};
  for (const [docKey, entries] of Object.entries(normalized)) {
    const persisted = (entries || [])
      .map(buildPatentDocumentMeta)
      .filter(Boolean);
    if (persisted.length > 0) {
      result[docKey] = persisted;
    }
  }
  return result;
};

export const normalizePatentDocumentsChecklist = (stored = {}) => {
  const checklist = {};
  for (const [storedKey, checked] of Object.entries(stored)) {
    if (!checked) continue;
    checklist[resolvePatentDocumentKey(storedKey)] = true;
  }
  return checklist;
};

export const buildPatentDocumentsChecklist = (filesMap = {}) =>
  PATENT_REQUIRED_DOCUMENT_KEYS.reduce((acc, docKey) => {
    acc[docKey] = (filesMap[docKey] || []).length > 0;
    return acc;
  }, {});

export const uploadPatentDocumentFile = async ({ storage, patentId, docKey, file }) => {
  const safeFileName = sanitizeStorageFileName(file.name);
  const storagePath = `patents/${patentId}/required/${docKey}/${Date.now()}-${safeFileName}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file, {
    contentType: file.type || 'application/octet-stream',
    contentDisposition: `attachment; filename="${safeFileName}"`,
  });
  const url = await getDownloadURL(fileRef);
  return buildPatentDocumentMeta({
    name: file.name,
    url,
    storagePath,
    uploadedAt: new Date().toISOString(),
  });
};

export const buildPatentRequiredDocumentsFilesUrls = async ({
  formFiles = {},
  previousFiles = {},
  docKeys = PATENT_REQUIRED_DOCUMENT_KEYS,
  patentId,
  storage,
}) => {
  const result = {};

  for (const docKey of docKeys) {
    const formEntries = formFiles[docKey];
    const previousEntries = previousFiles[docKey] || [];

    if (formEntries === undefined) {
      if (previousEntries.length > 0) {
        result[docKey] = previousEntries
          .map(buildPatentDocumentMeta)
          .filter(Boolean);
      }
      continue;
    }

    if (!formEntries.length) {
      result[docKey] = [];
      continue;
    }

    const uploadedOrExisting = [];
    for (const fileItem of formEntries) {
      const existingMeta = buildPatentDocumentMeta(fileItem);
      if (existingMeta) {
        uploadedOrExisting.push(existingMeta);
        continue;
      }

      if (fileItem instanceof File) {
        const meta = await uploadPatentDocumentFile({
          storage,
          patentId,
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
