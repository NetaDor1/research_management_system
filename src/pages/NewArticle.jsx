import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, Timestamp, query, where, getDocs, doc, getDoc, updateDoc, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, storage } from '../services/firebase';
import { createNotification } from '../services/notifications';
import { navigateBackOrFallback } from '../utils/navigation';
import { canDeleteArticle, getSubmissionStatus } from '../utils/submissionStatus';
import { sanitizeStorageFileName } from '../utils/fileDownload';
import FormEditToolbar from '../components/FormEditToolbar';
import './Page.css';
import './Research.css';

const ALLOWED_ARTICLE_FILE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_ARTICLE_FILE_EXT = /\.(pdf|doc|docx)$/i;

const isAllowedArticleFile = (file) => (
  ALLOWED_ARTICLE_FILE_TYPES.has(file.type) || ALLOWED_ARTICLE_FILE_EXT.test(file.name || '')
);

const getArticleStorageRootId = (researchProposalId, researcherId) => (
  researchProposalId || `researcher-${researcherId || 'unknown'}`
);

const buildArticleFileMeta = (fileItem) => {
  if (!fileItem || fileItem instanceof File || !fileItem.url) return null;
  return {
    name: fileItem.name || fileItem.fileName || 'file',
    url: fileItem.url,
    storagePath: fileItem.storagePath || '',
    uploadedAt: fileItem.uploadedAt || null,
  };
};

const NewArticle = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  const editId = searchParams.get('edit');

  // Options for journal ranking
  const journalRankingOptions = [
    'Q1',
    'Q2',
    'Q3',
    'Q4'
  ];

  const [formData, setFormData] = useState({
    title: '',
    journalName: '',
    journalRanking: '',
    publicationYear: '',
    articleLink: '',
    articleFile: null,
    researchProposalId: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [researchOptions, setResearchOptions] = useState([]);
  const [researchLoading, setResearchLoading] = useState(true);
  const [researchLoadError, setResearchLoadError] = useState('');
  const backPath = userRole === 'RESEARCHER' ? '/' : '/articles';
  const [existingResearcherId, setExistingResearcherId] = useState('');
  const previousArticleRef = useRef(null);

  useEffect(() => {
    const fetchResearchOptions = async () => {
      if (!db) {
        setResearchOptions([]);
        setResearchLoading(false);
        return;
      }

      setResearchLoading(true);
      setResearchLoadError('');
      try {
        const researchRef = collection(db, 'researchProposals');
        let researchSnapshot;

        if (userRole === 'ADMIN') {
          researchSnapshot = await getDocs(researchRef);
        } else if (user?.id) {
          const q = query(researchRef, where('researcherId', '==', user.id));
          researchSnapshot = await getDocs(q);
        } else {
          setResearchOptions([]);
          setResearchLoading(false);
          return;
        }

        const options = researchSnapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            id: docItem.id,
            title: data.projectTitle || data.title || 'ללא כותרת',
            researcherName: data.researcherName || data.researcher || 'חוקר'
          };
        });

        setResearchOptions(options);
      } catch (err) {
        console.error('Error loading research options:', err);
        setResearchLoadError(t('loadingResearchListError', 'שגיאה בטעינת רשימת מחקרים'));
        setResearchOptions([]);
      } finally {
        setResearchLoading(false);
      }
    };

    fetchResearchOptions();
  }, [userRole, user?.id]);

  // Load existing article for edit mode
  useEffect(() => {
    const loadExistingArticle = async () => {
      if (!editId || !db) return;

      try {
        const docRef = doc(db, 'articles', editId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          console.warn('Article to edit not found:', editId);
          return;
        }

        const data = snap.data();
        previousArticleRef.current = data;
        setExistingResearcherId(data.researcherId || '');

        setFormData(prev => ({
          ...prev,
          title: data.title || '',
          journalName: data.journalName || '',
          journalRanking: data.journalRanking || '',
          publicationYear: data.publicationYear || '',
          articleLink: data.articleLink || '',
          articleFile: data.articleFile?.url ? data.articleFile : null,
          researchProposalId: data.researchProposalId || ''
        }));
      } catch (err) {
        console.error('Error loading article for edit:', err);
      }
    };

    loadExistingArticle();
  }, [editId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const uploadArticleManuscript = async (articleId, file, researchProposalId, researcherId) => {
    const storageRootId = getArticleStorageRootId(researchProposalId, researcherId);
    const safeFileName = sanitizeStorageFileName(file.name);
    const storagePath = `researchProposals/${storageRootId}/articles/${articleId}/manuscript/${safeFileName}`;
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file, {
      contentType: file.type || 'application/octet-stream',
      contentDisposition: `attachment; filename="${safeFileName}"`,
    });
    const url = await getDownloadURL(fileRef);
    return {
      name: file.name,
      url,
      storagePath,
      uploadedAt: new Date().toISOString(),
    };
  };

  const persistArticleFile = async (articleId, uploadedFile) => {
    await updateDoc(doc(db, 'articles', articleId), {
      articleFile: uploadedFile,
      updatedAt: serverTimestamp(),
    });
    setFormData((prev) => ({ ...prev, articleFile: uploadedFile }));
    previousArticleRef.current = {
      ...(previousArticleRef.current || {}),
      articleFile: uploadedFile,
    };
  };

  const handleArticleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!isAllowedArticleFile(file)) {
      setErrors((prev) => ({
        ...prev,
        articleFile: t('articleFileInvalidType', 'ניתן להעלות רק קבצי PDF או Word'),
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.articleFile;
      return next;
    });

    if (editId) {
      setFileUploading(true);
      try {
        const uploadedFile = await uploadArticleManuscript(
          editId,
          file,
          formData.researchProposalId,
          user?.id
        );
        await persistArticleFile(editId, uploadedFile);
        alert(t('articleFileUploadSuccess', 'הקובץ הועלה בהצלחה'));
      } catch (uploadError) {
        console.error('Error uploading article file:', uploadError);
        alert(
          t(
            'articleFileUploadError',
            'העלאת הקובץ נכשלה. נסה/י שוב.'
          ) + (uploadError?.message ? ` (${uploadError.message})` : '')
        );
      } finally {
        setFileUploading(false);
      }
      return;
    }

    setFormData((prev) => ({ ...prev, articleFile: file }));
  };

  const handleArticleFileRemove = async () => {
    setFormData((prev) => ({ ...prev, articleFile: null }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.articleFile;
      return next;
    });

    if (editId && previousArticleRef.current?.articleFile?.url) {
      try {
        await updateDoc(doc(db, 'articles', editId), {
          articleFile: null,
          updatedAt: serverTimestamp(),
        });
        previousArticleRef.current = {
          ...previousArticleRef.current,
          articleFile: null,
        };
      } catch (removeError) {
        console.error('Error removing article file:', removeError);
        alert(t('articleFileRemoveError', 'שגיאה בהסרת הקובץ'));
      }
    }
  };

  const getArticleFilePreview = () => {
    const fileItem = formData.articleFile;
    if (!fileItem) return { name: '', url: '' };
    if (fileItem instanceof File) {
      return { name: fileItem.name, url: URL.createObjectURL(fileItem) };
    }
    return {
      name: fileItem.name || fileItem.fileName || 'file',
      url: fileItem.url || '',
    };
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = `${t('articleTitleLabel', 'כותרת המאמר')} חובה`;
    }
    if (!formData.journalName.trim()) {
      newErrors.journalName = `${t('publishedJournalName', 'שם העיתון בו פורסם')} חובה`;
    }
    if (!formData.journalRanking) {
      newErrors.journalRanking = `${t('journalRankingLabel', 'דירוג העיתון')} חובה`;
    }
    if (!formData.publicationYear) {
      newErrors.publicationYear = `${t('publicationYearLabel', 'שנת הפרסום')} חובה`;
    } else if (formData.publicationYear.length !== 4 || isNaN(formData.publicationYear)) {
      newErrors.publicationYear = `${t('publicationYearLabel', 'שנת הפרסום')} חייבת להיות 4 ספרות`;
    }
    if (formData.articleLink && !isValidUrl(formData.articleLink)) {
      newErrors.articleLink = 'Invalid link';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const validateDraftForm = () => {
    if (!formData.title.trim()) {
      setErrors({ title: t('draftTitleRequired', 'יש להזין לפחות כותרת לשמירת טיוטה') });
      return false;
    }
    setErrors({});
    return true;
  };

  const saveArticle = async (asDraft = false) => {
    if (asDraft) {
      if (!validateDraftForm()) {
        alert(t('draftTitleRequired', 'יש להזין לפחות כותרת לשמירת טיוטה'));
        return;
      }
    } else if (!validateForm()) {
      alert(t('fillRequiredFields', 'יש למלא את כל השדות החובה'));
      return;
    }

    setIsSubmitting(true);

    try {
      const wasDraft = getSubmissionStatus(previousArticleRef.current) === 'draft';
      const researcherId = user?.id || 'temp-user-id';
      const researcherName = user?.name || 'חוקר';

      console.log('Starting to save article...');
      console.log('Researcher ID:', researcherId);
      console.log('Researcher Name:', researcherName);

      // Convert publication year to date (first day of the year)
      const publicationDate = formData.publicationYear 
        ? Timestamp.fromDate(new Date(`${formData.publicationYear}-01-01`))
        : serverTimestamp();

      const existingArticleFile = previousArticleRef.current?.articleFile;
      let articleFileMeta = buildArticleFileMeta(formData.articleFile);
      if (!articleFileMeta && formData.articleFile instanceof File && existingArticleFile?.url) {
        articleFileMeta = buildArticleFileMeta(existingArticleFile);
      }

      // Prepare article data
      const articleData = {
        // פרטים כלליים
        title: formData.title,
        journalName: formData.journalName,
        journalRanking: formData.journalRanking,
        publicationYear: formData.publicationYear,
        articleLink: formData.articleLink || '',
        articleFile: articleFileMeta,
        researchProposalId: formData.researchProposalId || '',
        
        // פרטי החוקר
        researcherId: researcherId,
        researcherName: researcherName,
        
        // סטטוס מאמר: הוגש -> בהמתנה -> אושר/נדחה
        status: editId ? (previousArticleRef.current?.status || 'submitted') : 'submitted',
        publicationType: 'journal', // ברירת מחדל - כתב עת
        
        // תאריך פרסום
        publicationDate: publicationDate,
        
        // תאריכים מערכתיים
        submissionStatus: userRole === 'ADMIN' && editId
          ? (previousArticleRef.current?.submissionStatus || 'submitted')
          : (asDraft ? 'draft' : 'submitted'),
        submittedAt: asDraft
          ? (previousArticleRef.current?.submittedAt || null)
          : serverTimestamp(),
        draftUpdatedAt: asDraft ? serverTimestamp() : (previousArticleRef.current?.draftUpdatedAt || null),
        createdAt: editId ? (previousArticleRef.current?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp(),
        isNew: asDraft ? false : ((!editId || wasDraft) ? true : Boolean(previousArticleRef.current?.isNew))
      };

      console.log('Article data prepared:', articleData);

      // Create or update document in Firestore
      let docId = editId;
      if (editId) {
        await updateDoc(doc(db, 'articles', editId), articleData);
      } else {
        const docRef = await addDoc(collection(db, 'articles'), articleData);
        docId = docRef.id;
        console.log('Document created with ID:', docId);
      }

      if (docId && formData.articleFile instanceof File) {
        try {
          const uploadedFile = await uploadArticleManuscript(
            docId,
            formData.articleFile,
            formData.researchProposalId,
            researcherId
          );
          await persistArticleFile(docId, uploadedFile);
        } catch (uploadError) {
          console.error('Error uploading article file:', uploadError);
          alert(
            t(
              'articleFileUploadError',
              'המאמר נשמר, אך העלאת הקובץ נכשלה. נסה/י שוב בעריכת המאמר.'
            ) + (uploadError?.message ? ` (${uploadError.message})` : '')
          );
        }
      }

      if (!asDraft && docId && formData.researchProposalId) {
        try {
          await updateDoc(doc(db, 'researchProposals', formData.researchProposalId), {
            hasArticle: true,
            linkedArticleIds: arrayUnion(docId),
            updatedAt: serverTimestamp()
          });
        } catch (linkError) {
          console.warn('Failed to link article to research proposal:', linkError);
        }
      }

      // ── Notify admin when RESEARCHER submits article (not draft) ──────────────────────
      if (userRole === 'RESEARCHER' && !asDraft) {
        const notifyAsNew = !editId || wasDraft;
        await createNotification({
          userId: 'ADMIN',
          targetRole: 'ADMIN',
          title: notifyAsNew ? 'חוקר הוסיף מאמר חדש' : 'חוקר עדכן מאמר',
          message: notifyAsNew
            ? `${user?.name || 'חוקר'} הוסיף/ה מאמר חדש: "${formData.title}".`
            : `${user?.name || 'חוקר'} עדכן/ה את המאמר "${formData.title}".`,
          type: notifyAsNew ? 'researcher_new_article' : 'researcher_edit_article',
          entityType: 'article',
          entityId: docId,
          link: `/articles/${docId}`,
          eventKey: `${notifyAsNew ? 'researcher_new_article' : 'researcher_edit_article'}:${docId}:${Date.now()}`
        });
      }

      if (userRole === 'ADMIN') {
        let targetResearcherId = existingResearcherId;
        if (!editId && formData.researchProposalId) {
          const researchSnap = await getDoc(doc(db, 'researchProposals', formData.researchProposalId));
          targetResearcherId = researchSnap.exists() ? researchSnap.data().researcherId : '';
        }

        if (targetResearcherId) {
          await createNotification({
            userId: targetResearcherId,
            title: editId ? 'עדכון מאמר' : 'נוסף מאמר חדש',
            message: editId
              ? `המאמר "${formData.title}" עודכן על ידי רשות המחקר.`
              : `נוסף מאמר חדש בשם "${formData.title}" המקושר למחקר שלך.`,
            type: 'article_update',
            entityType: 'article',
            entityId: docId,
            link: `/articles/${docId}`,
            eventKey: `${editId ? 'article_updated' : 'article_created'}:${docId}:${Date.now()}`
          });
        }
      }

      console.log('Article saved successfully!');
      if (asDraft) {
        alert(t('draftSavedSuccess', 'הטיוטה נשמרה בהצלחה'));
        if (!editId) {
          navigate(`/articles/new?edit=${docId}`, { replace: true });
        }
        return;
      }
      alert(t('saveArticleSuccess', 'המאמר נשמר בהצלחה!'));
      navigate(backPath);
    } catch (error) {
      console.error('Error saving article:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'שגיאה בשמירת המאמר. ';
      
      if (error.code === 'permission-denied') {
        errorMessage += 'אין הרשאה לשמור. בדקי את ה-Security Rules ב-Firebase.';
      } else if (error.code === 'unavailable') {
        errorMessage += 'Firebase לא זמין כרגע. נסי שוב מאוחר יותר.';
      } else {
        errorMessage += `פרטים: ${error.message || 'שגיאה לא ידועה'}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveArticle(false);
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    await saveArticle(true);
  };

  const handleDeleteArticle = async () => {
    if (!editId || !db || deleting) return;

    const existing = previousArticleRef.current;
    if (!canDeleteArticle(existing)) {
      alert(t('deleteArticleNotAllowed', 'ניתן למחוק רק מאמר בטיוטה או בסטטוס הוגש/בהמתנה'));
      return;
    }

    if (userRole === 'RESEARCHER' && existing?.researcherId !== user?.id) {
      alert(t('noPermissionAction', 'אין הרשאה לבצע פעולה זו'));
      return;
    }

    if (!window.confirm(t('confirmDeleteArticle', 'האם את/ה בטוח/ה שברצונך למחוק את המאמר? פעולה זו אינה ניתנת לביטול.'))) {
      return;
    }

    setDeleting(true);
    try {
      const researchProposalId = existing?.researchProposalId;
      if (researchProposalId) {
        const researchRef = doc(db, 'researchProposals', researchProposalId);
        const researchSnap = await getDoc(researchRef);
        if (researchSnap.exists()) {
          const linkedIds = (researchSnap.data().linkedArticleIds || []).filter((id) => id !== editId);
          await updateDoc(researchRef, {
            linkedArticleIds: arrayRemove(editId),
            hasArticle: linkedIds.length > 0,
            updatedAt: serverTimestamp(),
          });
        }
      }

      const batch = writeBatch(db);
      batch.delete(doc(db, 'articles', editId));
      await batch.commit();

      alert(t('deleteArticleSuccess', 'המאמר נמחק בהצלחה'));
      navigate(backPath);
    } catch (error) {
      console.error('Error deleting article:', error);
      alert(t('deleteArticleError', 'שגיאה במחיקת המאמר'));
    } finally {
      setDeleting(false);
    }
  };

  const isCurrentDraft = !editId || getSubmissionStatus(previousArticleRef.current) === 'draft';
  const showDraftButton = userRole === 'RESEARCHER' && isCurrentDraft;
  const showDeleteButton =
    Boolean(editId) &&
    canDeleteArticle(previousArticleRef.current) &&
    (userRole === 'ADMIN' || previousArticleRef.current?.researcherId === user?.id);

  const getCancelTarget = () => (editId ? `/articles/${editId}` : backPath);

  const handleCancel = () => {
    if (editId && !window.confirm(t('confirmCancelEdit', 'השינויים שביצעת לא יישמרו. האם לבטל את העריכה?'))) {
      return;
    }
    navigateBackOrFallback(navigate, getCancelTarget());
  };

  const isBusy = isSubmitting || deleting || fileUploading;
  const articleFilePreview = getArticleFilePreview();

  return (
    <div className="page-container">
      <div className="page-content" style={{ maxWidth: '800px' }}>
        <div className="form-page-header">
          <h1>{t('newArticleTitle', 'הוספת מאמר חדש')}</h1>
          <FormEditToolbar
            visible={Boolean(editId)}
            onCancelEdit={handleCancel}
            deleting={deleting}
            t={t}
          />
        </div>
        <p className="form-subtitle">{t('newArticleSubtitle', 'מלא/י את הפרטים הבאים להוספת מאמר')}</p>

        <form onSubmit={handleSubmit} className="research-form">
          <div className="form-section">
            <h2>{t('articleDetailsTitle', 'פרטי המאמר')}</h2>
            
            <div className="form-group">
              <label>{t('articleTitleLabel', 'כותרת המאמר')} *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={errors.title ? 'error' : ''}
                placeholder={t('enterArticleTitle', 'הכנס כותרת המאמר')}
                required
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label>{t('linkExistingResearch', 'קישור למחקר קיים')}</label>
              <select
                name="researchProposalId"
                value={formData.researchProposalId}
                onChange={handleInputChange}
                disabled={researchLoading}
              >
                <option value="">{t('selectResearchFromList', 'בחר מחקר מהרשימה')}</option>
                {researchOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.title}{userRole === 'ADMIN' ? ` - ${option.researcherName}` : ''}
                  </option>
                ))}
              </select>
              {researchLoadError && <span className="error-message">{researchLoadError}</span>}
            </div>

            <div className="form-group">
              <label>{t('publishedJournalName', 'שם העיתון בו פורסם')} *</label>
              <input
                type="text"
                name="journalName"
                value={formData.journalName}
                onChange={handleInputChange}
                className={errors.journalName ? 'error' : ''}
                placeholder={t('enterJournalName', 'הכנס שם העיתון')}
                required
              />
              {errors.journalName && <span className="error-message">{errors.journalName}</span>}
            </div>

            <div className="form-group">
              <label>{t('journalRankingLabel', 'דירוג העיתון')} *</label>
              <select
                name="journalRanking"
                value={formData.journalRanking}
                onChange={handleInputChange}
                className={errors.journalRanking ? 'error' : ''}
                required
              >
                <option value="">{t('selectRanking', 'בחר דירוג')}</option>
                {journalRankingOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.journalRanking && <span className="error-message">{errors.journalRanking}</span>}
            </div>

            <div className="form-group">
              <label>{t('publicationYearLabel', 'שנת הפרסום')} *</label>
              <input
                type="number"
                name="publicationYear"
                value={formData.publicationYear}
                onChange={handleInputChange}
                className={errors.publicationYear ? 'error' : ''}
                placeholder={t('publicationYearPlaceholder', 'שנה (4 ספרות, למשל: 2024)')}
                min="1900"
                max="2100"
                maxLength={4}
                required
              />
              {errors.publicationYear && <span className="error-message">{errors.publicationYear}</span>}
            </div>

            <div className="form-group">
              <label>{t('articleLinkLabel', 'קישור למאמר')}</label>
              <input
                type="url"
                name="articleLink"
                value={formData.articleLink}
                onChange={handleInputChange}
                className={errors.articleLink ? 'error' : ''}
                placeholder="https://..."
              />
              {errors.articleLink && <span className="error-message">{errors.articleLink}</span>}
              {formData.articleLink && !errors.articleLink && (
                <a 
                  href={formData.articleLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'block', marginTop: '8px', color: '#667eea' }}
                >
                  {t('openLink', 'פתח קישור')} →
                </a>
              )}
            </div>

            <div className="form-group">
              <label>{t('articleFileLabel', 'קובץ המאמר (PDF / Word)')}</label>
              <p style={{ marginTop: 0, marginBottom: '8px', color: '#64748b', fontSize: '13px' }}>
                {t('articleFileHint', 'ניתן להעלות קובץ PDF או Word (אופציונלי)')}
              </p>
              {fileUploading && (
                <p style={{ margin: '0 0 8px', color: '#667eea', fontWeight: 600 }}>
                  {t('uploadingArticleFile', 'מעלה קובץ...')}
                </p>
              )}
              {formData.articleFile ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      href={articleFilePreview.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#667eea', wordBreak: 'break-all' }}
                    >
                      📄 {articleFilePreview.name}
                    </a>
                    <button type="button" className="remove-btn" onClick={handleArticleFileRemove} disabled={fileUploading}>
                      {t('removeArticleFile', 'הסר קובץ')}
                    </button>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleArticleFileSelect}
                    disabled={fileUploading}
                  />
                </div>
              ) : (
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleArticleFileSelect}
                  disabled={fileUploading}
                />
              )}
              {errors.articleFile && <span className="error-message">{errors.articleFile}</span>}
            </div>
          </div>

          {/* כפתורי שליחה */}
          <div className="form-actions">
            <div className="form-actions-start">
              <button type="button" onClick={handleCancel} className="cancel-btn" disabled={isBusy}>
                {t('cancel', 'ביטול')}
              </button>
              {showDeleteButton && (
                <button type="button" className="btn-delete" onClick={handleDeleteArticle} disabled={isBusy}>
                  {deleting ? t('deleting', 'מוחק...') : t('deleteArticle', 'מחק מאמר')}
                </button>
              )}
              {showDraftButton && (
                <button type="button" className="btn-draft" onClick={handleSaveDraft} disabled={isBusy}>
                  {t('saveDraft', 'שמור כטיוטה')}
                </button>
              )}
            </div>
            <div className="form-actions-end">
              <button type="submit" className="submit-btn" disabled={isBusy}>
                {isSubmitting
                  ? t('saving', 'שומר...')
                  : (userRole === 'RESEARCHER' ? t('submitArticle', 'הגש מאמר') : t('saveArticle', 'שמור מאמר'))}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewArticle;

