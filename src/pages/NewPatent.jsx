import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, writeBatch, serverTimestamp, Timestamp, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, storage } from '../services/firebase';
import { createNotification } from '../services/notifications';
import { navigateBackOrFallback } from '../utils/navigation';
import DocumentChecklistCard from '../components/research/form/DocumentChecklistCard';
import { canDeletePatent, getSubmissionStatus } from '../utils/submissionStatus';
import FormEditToolbar from '../components/FormEditToolbar';
import '../components/research/form/DocumentChecklistCard.css';
import './Page.css';
import './Research.css';

const NewPatent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  const editId = searchParams.get('edit');

  // Options for dropdowns
  const institutionPercentageOptions = [
    '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%'
  ];

  const commercializationUnitOptions = [
    'יחידת מסחור 1',
    'יחידת מסחור 2',
    'יחידת מסחור 3',
    'יחידת מסחור 4',
    'יחידת מסחור 5',
    'יחידת מסחור 6',
    'יחידת מסחור 7',
    'יחידת מסחור 8',
    'יחידת מסחור 9',
    'יחידת מסחור 10'
  ];

  const submissionPathOptions = [
    'מסלול רגיל',
    'מסלול מהיר',
    'מסלול בינלאומי',
    'מסלול מיוחד'
  ];

  const researcherRoleOptions = [
    'חוקר ראשי',
    'חוקר משנה'
  ];

  const patentStatusOptions = [
    { value: 'in-process', label: 'בהליך' },
    { value: 'registered', label: 'רשום' },
    { value: 'approved', label: 'אושר' }
  ];

  const patentStageOptions = [
    { value: 'stage1', label: 'שלב 1: הגשת בקשה' },
    { value: 'stage2', label: 'שלב 2: בדיקה ראשונית' },
    { value: 'stage3', label: 'שלב 3: בחינה' },
    { value: 'stage4', label: 'שלב 4: אישור' },
    { value: 'stage5', label: 'שלב 5: רישום' }
  ];

  const currencyOptions = [
    { value: 'ILS', label: '₪ (שקל)' },
    { value: 'USD', label: '$ (דולר)' },
    { value: 'EUR', label: '€ (אירו)' }
  ];

  const requiredDocuments = [
    'מסמך הבקשה לפטנט',
    'אישור מוסדי',
    'הסכם שותפים',
    'תקציב מפורט',
    'מסמכי רישום',
    'אישורי תשלום'
  ];

  // Date fields for patent timeline (8 dates)
  const dateFields = [
    { key: 'submissionDate', label: 'תאריך הגשת הבקשה לפטנט' },
    { key: 'initialReviewDate', label: 'תאריך בדיקה ראשונית' },
    { key: 'examinationDate', label: 'תאריך בחינה' },
    { key: 'approvalDate', label: 'תאריך אישור' },
    { key: 'registrationDate', label: 'תאריך רישום' },
    { key: 'publicationDate', label: 'תאריך פרסום' },
    { key: 'renewalDate', label: 'תאריך חידוש' },
    { key: 'expiryDate', label: 'תאריך תפוגה' }
  ];

  const [formData, setFormData] = useState({
    projectTitle: '',
    researchProposalId: '',
    institutionPercentage: '',
    partners: [{ name: '', email: '', institution: '', percentage: '' }],
    commercializationUnit: '',
    commercializationContact1: '',
    commercializationContact2: '',
    commercializationEmail1: '',
    commercializationEmail2: '',
    submissionPath: '',
    researcherRole: '',
    patentStatus: 'in-process',
    patentStage: '',
    dates: {
      submissionDate: '',
      initialReviewDate: '',
      examinationDate: '',
      approvalDate: '',
      registrationDate: '',
      publicationDate: '',
      renewalDate: '',
      expiryDate: ''
    },
    totalBudget: '',
    currency: 'ILS',
    convertedBudget: '',
    stageBudgets: {},
    requiredDocumentsChecklist: {},
    requiredDocumentsFiles: {},
    digitalSignature: { signed: false, date: '', signer: '' },
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasPartners, setHasPartners] = useState(false);
  const [researchOptions, setResearchOptions] = useState([]);
  const [researchLoading, setResearchLoading] = useState(true);
  const [researchLoadError, setResearchLoadError] = useState('');
  const [existingResearcherId, setExistingResearcherId] = useState('');
  const isEdit = Boolean(editId);
  const datePickerRefs = useRef({});
  const previousPatentRef = useRef(null);

  const convertDateToISO = (dateValue) => {
    if (!dateValue || typeof dateValue !== 'string') return '';
    const trimmed = dateValue.trim();
    const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = trimmed.match(ddmmyyyy);
    if (!match) return '';
    const [, day, month, year] = match;
    const iso = `${year}-${month}-${day}`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? '' : iso;
  };

  // Calculate converted budget based on currency
  useEffect(() => {
    if (formData.totalBudget && formData.currency) {
      const budget = parseFloat(formData.totalBudget) || 0;
      let converted = budget;
      
      // Simple conversion rates (should be fetched from API in production)
      if (formData.currency === 'USD') {
        converted = budget * 3.5; // ILS to USD
      } else if (formData.currency === 'EUR') {
        converted = budget * 3.8; // ILS to EUR
      }
      
      setFormData(prev => ({
        ...prev,
        convertedBudget: converted.toFixed(2)
      }));
    }
  }, [formData.totalBudget, formData.currency]);

  // Calculate total budget automatically from stage budgets
  useEffect(() => {
    const total = Object.values(formData.stageBudgets || {}).reduce((sum, amount) => {
      const numAmount = parseFloat(amount) || 0;
      return sum + numAmount;
    }, 0);

    setFormData((prev) => ({
      ...prev,
      totalBudget: total > 0 ? total.toString() : '',
    }));
  }, [formData.stageBudgets]);

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
        setResearchLoadError('שגיאה בטעינת רשימת מחקרים');
        setResearchOptions([]);
      } finally {
        setResearchLoading(false);
      }
    };

    fetchResearchOptions();
  }, [userRole, user?.id]);

  // Load existing patent data for edit mode
  useEffect(() => {
    const loadExistingPatent = async () => {
      if (!editId || !db) return;

      try {
        const docRef = doc(db, 'patents', editId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          console.warn('Patent to edit not found:', editId);
          return;
        }

        const data = snap.data();
        previousPatentRef.current = data;
        setExistingResearcherId(data.researcherId || '');

        // Convert dates (Firestore Timestamp or string) to dd/mm/yyyy
        const convertToInputDate = (value) => {
          if (!value) return '';
          try {
            let d;
            if (value && typeof value.toDate === 'function') {
              d = value.toDate();
            } else if (value && value.seconds) {
              d = new Date(value.seconds * 1000);
            } else if (typeof value === 'string') {
              const asIso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
              if (asIso) {
                const [, year, month, day] = asIso;
                return `${day}/${month}/${year}`;
              }
              const asDisplay = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
              if (asDisplay) return value;
              d = new Date(value);
            } else {
              return '';
            }
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${day}/${month}/${year}`;
          } catch {
            return '';
          }
        };

        const loadedDates = {};
        dateFields.forEach(({ key }) => {
          loadedDates[key] = convertToInputDate(data[key]);
        });

        setFormData(prev => ({
          ...prev,
          projectTitle: data.projectTitle || data.title || '',
          researchProposalId: data.researchProposalId || '',
          institutionPercentage: data.institutionPercentage || '',
          partners: (data.partners && data.partners.length > 0)
            ? data.partners
            : [{ name: '', email: '', institution: '', percentage: '' }],
          commercializationUnit: data.commercializationUnit || '',
          commercializationContact1: data.commercializationContact1 || '',
          commercializationContact2: data.commercializationContact2 || '',
          commercializationEmail1: data.commercializationEmail1 || '',
          commercializationEmail2: data.commercializationEmail2 || '',
          submissionPath: data.submissionPath || '',
          researcherRole: data.researcherRole || '',
          patentStatus: data.status || data.patentStatus || 'in-process',
          patentStage: data.patentStage || '',
          dates: {
            ...prev.dates,
            ...loadedDates
          },
          totalBudget: data.totalBudget || '',
          currency: data.currency || 'ILS',
          convertedBudget: data.convertedBudget || '',
          stageBudgets: data.stageBudgets || {},
          requiredDocumentsChecklist: data.requiredDocumentsChecklist || {},
          requiredDocumentsFiles: data.requiredDocumentsFiles || {},
          digitalSignature: data.digitalSignature || { signed: false, date: '', signer: '' },
          notes: data.notes || ''
        }));

        setHasPartners(Boolean(data.partners && data.partners.length > 0));
      } catch (err) {
        console.error('Error loading patent for edit:', err);
      }
    };

    loadExistingPatent();
  }, [editId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      dates: {
        ...prev.dates,
        [field]: value
      }
    }));
  };

  const handleDatePickerChange = (field, isoDate) => {
    if (!isoDate) {
      handleDateChange(field, '');
      return;
    }
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) {
      handleDateChange(field, '');
      return;
    }
    handleDateChange(field, `${day}/${month}/${year}`);
  };

  const handlePartnerChange = (index, field, value) => {
    const newPartners = [...formData.partners];
    newPartners[index][field] = value;
    setFormData(prev => ({
      ...prev,
      partners: newPartners
    }));
  };

  const addPartner = () => {
    setFormData(prev => ({
      ...prev,
      partners: [...prev.partners, { name: '', email: '', institution: '', percentage: '' }]
    }));
  };

  const removePartner = (index) => {
    setFormData(prev => ({
      ...prev,
      partners: prev.partners.filter((_, i) => i !== index)
    }));
  };

  const handleStageBudgetChange = (stage, value) => {
    setFormData(prev => ({
      ...prev,
      stageBudgets: {
        ...prev.stageBudgets,
        [stage]: value
      }
    }));
  };

  const handleRequiredDocumentUpload = (documentName, selectedFiles) => {
    const files = Array.from(selectedFiles || []);
    if (files.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      requiredDocumentsFiles: {
        ...prev.requiredDocumentsFiles,
        [documentName]: [...(prev.requiredDocumentsFiles?.[documentName] || []), ...files],
      },
      requiredDocumentsChecklist: {
        ...prev.requiredDocumentsChecklist,
        [documentName]: true,
      },
    }));
  };

  const handleRemoveRequiredDocumentFile = (documentName, fileIndex) => {
    setFormData((prev) => {
      const currentFiles = [...(prev.requiredDocumentsFiles?.[documentName] || [])];
      currentFiles.splice(fileIndex, 1);

      return {
        ...prev,
        requiredDocumentsFiles: {
          ...prev.requiredDocumentsFiles,
          [documentName]: currentFiles,
        },
        requiredDocumentsChecklist: {
          ...prev.requiredDocumentsChecklist,
          [documentName]: currentFiles.length > 0,
        },
      };
    });
  };

  const handleDigitalSignature = () => {
    setFormData((prev) => ({
      ...prev,
      digitalSignature: {
        signed: true,
        date: new Date().toISOString().split('T')[0],
        signer: user?.name || 'חתימה דיגיטלית',
      },
    }));
  };

  const generateOutlookCalendarLink = (date, title) => {
    if (!date) return '';
    const isoDate = convertDateToISO(date);
    if (!isoDate) return '';
    const dateStr = new Date(isoDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const encodedTitle = encodeURIComponent(title || 'תאריך פטנט');
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedTitle}&startdt=${dateStr}&enddt=${dateStr}`;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectTitle.trim()) {
      newErrors.projectTitle = 'כותרת הפרוייקט חובה';
    }
    if (!formData.institutionPercentage) {
      newErrors.institutionPercentage = 'אחוזי המוסד חובה';
    }
    if (!formData.commercializationUnit) {
      newErrors.commercializationUnit = 'יחידת המסחור חובה';
    }
    if (!formData.submissionPath) {
      newErrors.submissionPath = 'מסלול ההגשה חובה';
    }
    if (!formData.researcherRole) {
      newErrors.researcherRole = 'תפקיד החוקר חובה';
    }
    if (!formData.patentStatus) {
      newErrors.patentStatus = 'סטטוס הפטנט חובה';
    }
    if (!formData.patentStage) {
      newErrors.patentStage = 'שלב הפטנט חובה';
    }
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!formData.dates.submissionDate) {
      newErrors.submissionDate = 'תאריך הגשת הבקשה חובה';
    } else if (!datePattern.test(formData.dates.submissionDate)) {
      newErrors.submissionDate = 'תאריך לא תקין. נא להזין בפורמט dd/mm/yyyy';
    } else if (!convertDateToISO(formData.dates.submissionDate)) {
      newErrors.submissionDate = 'תאריך לא תקין';
    }
    const hasStageBudget = Object.values(formData.stageBudgets || {}).some((amount) => {
      const numAmount = parseFloat(amount) || 0;
      return numAmount > 0;
    });
    if (!hasStageBudget) {
      newErrors.totalBudget = 'יש למלא לפחות רכיב תקציב אחד';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDraftForm = () => {
    if (!formData.projectTitle.trim()) {
      setErrors({ projectTitle: t('draftTitleRequired', 'יש להזין לפחות כותרת לשמירת טיוטה') });
      return false;
    }
    setErrors({});
    return true;
  };

  const savePatent = async (asDraft = false) => {
    if (asDraft) {
      if (!validateDraftForm()) {
        alert(t('draftTitleRequired', 'יש להזין לפחות כותרת לשמירת טיוטה'));
        return;
      }
    } else if (!validateForm()) {
      alert('יש למלא את כל השדות החובה');
      return;
    }

    setIsSubmitting(true);

    try {
      const wasDraft = getSubmissionStatus(previousPatentRef.current) === 'draft';
      const researcherId = user?.id || 'temp-user-id';
      const researcherName = user?.name || 'חוקר';

      console.log('Starting to save patent...');

      // Convert dates to Timestamp for Firestore
      const datesTimestamps = {};
      Object.keys(formData.dates).forEach(key => {
        if (formData.dates[key]) {
          const isoDate = convertDateToISO(formData.dates[key]);
          if (isoDate) {
            datesTimestamps[key] = Timestamp.fromDate(new Date(isoDate));
          }
        }
      });

      // Prepare patent data
      const linkedResearch = formData.researchProposalId
        ? researchOptions.find(option => option.id === formData.researchProposalId)
        : null;

      const requiredDocumentsChecklistFromFiles = requiredDocuments.reduce((acc, docName) => {
        const filesForDoc = formData.requiredDocumentsFiles?.[docName] || [];
        acc[docName] = filesForDoc.length > 0;
        return acc;
      }, {});

      const patentData = {
        // פרטים כלליים
        title: formData.projectTitle,
        projectTitle: formData.projectTitle,
        researchProposalId: formData.researchProposalId || null,
        researchProposalTitle: linkedResearch?.title || '',
        
        // אחוזי המוסד
        institutionPercentage: formData.institutionPercentage,
        
        // שותפים
        partners: hasPartners
          ? formData.partners.filter(p => p.name || p.email || p.institution || p.percentage)
          : [],
        
        // יחידת מסחור
        commercializationUnit: formData.commercializationUnit,
        commercializationContact1: formData.commercializationContact1,
        commercializationContact2: formData.commercializationContact2,
        commercializationEmail1: formData.commercializationEmail1,
        commercializationEmail2: formData.commercializationEmail2,
        
        // מסלול ותפקיד
        submissionPath: formData.submissionPath,
        researcherRole: formData.researcherRole,
        
        // סטטוס ושלב
        status: formData.patentStatus,
        patentStage: formData.patentStage,
        
        // תאריכים
        ...datesTimestamps,
        registrationDate: datesTimestamps.registrationDate || datesTimestamps.submissionDate || serverTimestamp(),
        
        // תקציב
        totalBudget: formData.totalBudget || '',
        currency: formData.currency || 'ILS',
        convertedBudget: formData.convertedBudget || '',
        stageBudgets: formData.stageBudgets || {},
        
        // מסמכים (הקישורים עצמם יעודכנו לאחר העלאת הקבצים)
        requiredDocumentsChecklist: requiredDocumentsChecklistFromFiles,
        requiredDocumentsFiles: isEdit ? (formData.requiredDocumentsFiles || {}) : {},
        
        // חתימה
        digitalSignature: formData.digitalSignature || { signed: false, signer: '', date: null },
        
        // הערות
        notes: formData.notes || '',
        
        // פרטי החוקר
        researcherId: researcherId,
        researcherName: researcherName,
        
        // תאריכים מערכתיים
        submissionStatus: userRole === 'ADMIN' && isEdit
          ? (previousPatentRef.current?.submissionStatus || 'submitted')
          : (asDraft ? 'draft' : 'submitted'),
        submittedAt: asDraft
          ? (previousPatentRef.current?.submittedAt || null)
          : serverTimestamp(),
        draftUpdatedAt: asDraft ? serverTimestamp() : (previousPatentRef.current?.draftUpdatedAt || null),
        createdAt: isEdit ? (previousPatentRef.current?.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp(),
        isNew: asDraft ? false : ((!isEdit || wasDraft) ? true : Boolean(previousPatentRef.current?.isNew))
      };

      console.log('Patent data prepared:', patentData);

      // Create or update document in Firestore
      let docId = editId;
      if (isEdit) {
        await updateDoc(doc(db, 'patents', editId), patentData);
      } else {
        const docRef = await addDoc(collection(db, 'patents'), patentData);
        docId = docRef.id;
        console.log('Document created with ID:', docId);
      }

      // Upload files after document creation
      let requiredDocumentsFilesUrls = { ...(formData.requiredDocumentsFiles || {}) };
      
      if (docId) {
        try {
          const nextRequiredDocumentsFiles = {};
          for (const docName of requiredDocuments) {
            const docFiles = formData.requiredDocumentsFiles?.[docName] || [];
            const uploadedOrExisting = [];

            for (let idx = 0; idx < docFiles.length; idx++) {
              const fileItem = docFiles[idx];

              if (fileItem && typeof fileItem === 'object' && fileItem.url) {
                uploadedOrExisting.push(fileItem);
                continue;
              }

              if (fileItem instanceof File) {
                const safeDocName = encodeURIComponent(docName);
                const fileRef = ref(
                  storage,
                  `patents/${docId}/required/${safeDocName}/${Date.now()}-${idx}-${fileItem.name}`
                );
                await uploadBytes(fileRef, fileItem);
                const url = await getDownloadURL(fileRef);
                uploadedOrExisting.push({
                  name: fileItem.name,
                  url,
                  uploadedAt: new Date().toISOString(),
                });
              }
            }

            nextRequiredDocumentsFiles[docName] = uploadedOrExisting;
          }

          requiredDocumentsFilesUrls = nextRequiredDocumentsFiles;
        } catch (requiredDocsError) {
          console.error('Error uploading required patent documents:', requiredDocsError);
        }
      }

      // Update document with file URLs if any files were uploaded
      if (docId && Object.keys(requiredDocumentsFilesUrls).length > 0) {
        try {
          const nextRequiredChecklist = requiredDocuments.reduce((acc, docName) => {
            acc[docName] = (requiredDocumentsFilesUrls[docName] || []).length > 0;
            return acc;
          }, {});

          await updateDoc(doc(db, 'patents', docId), {
            requiredDocumentsFiles: requiredDocumentsFilesUrls,
            requiredDocumentsChecklist: nextRequiredChecklist,
            updatedAt: serverTimestamp(),
          });
        } catch (updateError) {
          console.error('Error updating document with file URLs:', updateError);
        }
      }

      if (!asDraft && docId && formData.researchProposalId) {
        try {
          await updateDoc(doc(db, 'researchProposals', formData.researchProposalId), {
            hasPatent: true,
            linkedPatentIds: arrayUnion(docId),
            updatedAt: serverTimestamp()
          });
        } catch (linkError) {
          console.warn('Failed to link patent to research proposal:', linkError);
        }
      }

      // ── Notify admin when RESEARCHER submits patent (not draft) ───────────────────────
      if (userRole === 'RESEARCHER' && !asDraft) {
        const notifyAsNew = !isEdit || wasDraft;
        await createNotification({
          userId: 'ADMIN',
          targetRole: 'ADMIN',
          title: notifyAsNew ? 'חוקר הוסיף פטנט חדש' : 'חוקר עדכן פטנט',
          message: notifyAsNew
            ? `${user?.name || 'חוקר'} הוסיף/ה פטנט חדש: "${formData.projectTitle}".`
            : `${user?.name || 'חוקר'} עדכן/ה את הפטנט "${formData.projectTitle}".`,
          type: notifyAsNew ? 'researcher_new_patent' : 'researcher_edit_patent',
          entityType: 'patent',
          entityId: docId,
          link: `/patents/${docId}`,
          eventKey: `${notifyAsNew ? 'researcher_new_patent' : 'researcher_edit_patent'}:${docId}:${Date.now()}`
        });
      }

      if (userRole === 'ADMIN') {
        let targetResearcherId = existingResearcherId;
        if (!isEdit && formData.researchProposalId) {
          const researchSnap = await getDoc(doc(db, 'researchProposals', formData.researchProposalId));
          targetResearcherId = researchSnap.exists() ? researchSnap.data().researcherId : '';
        }

        if (targetResearcherId) {
          await createNotification({
            userId: targetResearcherId,
            title: isEdit ? 'עדכון פטנט' : 'נוסף פטנט חדש',
            message: isEdit
              ? `הפטנט "${formData.projectTitle}" עודכן על ידי רשות המחקר.`
              : `נוסף פטנט חדש בשם "${formData.projectTitle}" המקושר למחקר שלך.`,
            type: 'patent_update',
            entityType: 'patent',
            entityId: docId,
            link: `/patents/${docId}`,
            eventKey: `${isEdit ? 'patent_updated' : 'patent_created'}:${docId}:${Date.now()}`
          });
        }
      }

      console.log('Patent saved successfully!');
      if (asDraft) {
        alert(t('draftSavedSuccess', 'הטיוטה נשמרה בהצלחה'));
        if (!isEdit) {
          navigate(`/patents/new?edit=${docId}`, { replace: true });
        }
        return;
      }
      alert('הפטנט נשמר בהצלחה!');
      navigate(userRole === 'RESEARCHER' ? '/' : '/patents');
    } catch (error) {
      console.error('Error saving patent:', error);
      alert('שגיאה בשמירת הפטנט: ' + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await savePatent(false);
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    await savePatent(true);
  };

  const handleDeletePatent = async () => {
    if (!editId || !db || deleting) return;

    const existing = previousPatentRef.current;
    if (!canDeletePatent(existing)) {
      alert(t('deletePatentNotAllowed', 'ניתן למחוק רק פטנט בטיוטה או בסטטוס בהליך'));
      return;
    }

    if (userRole === 'RESEARCHER' && existing?.researcherId !== user?.id) {
      alert(t('noPermissionAction', 'אין הרשאה לבצע פעולה זו'));
      return;
    }

    if (!window.confirm(t('confirmDeletePatent', 'האם את/ה בטוח/ה שברצונך למחוק את הפטנט? פעולה זו אינה ניתנת לביטול.'))) {
      return;
    }

    setDeleting(true);
    try {
      const researchProposalId = existing?.researchProposalId;
      if (researchProposalId) {
        const researchRef = doc(db, 'researchProposals', researchProposalId);
        const researchSnap = await getDoc(researchRef);
        if (researchSnap.exists()) {
          const linkedIds = (researchSnap.data().linkedPatentIds || []).filter((id) => id !== editId);
          await updateDoc(researchRef, {
            linkedPatentIds: arrayRemove(editId),
            hasPatent: linkedIds.length > 0,
            updatedAt: serverTimestamp(),
          });
        }
      }

      const tasksSnap = await getDocs(collection(db, 'patents', editId, 'tasks'));
      const batch = writeBatch(db);
      tasksSnap.docs.forEach((taskDoc) => batch.delete(taskDoc.ref));
      batch.delete(doc(db, 'patents', editId));
      await batch.commit();

      alert(t('deletePatentSuccess', 'הפטנט נמחק בהצלחה'));
      navigate(userRole === 'RESEARCHER' ? '/' : '/patents');
    } catch (error) {
      console.error('Error deleting patent:', error);
      alert(t('deletePatentError', 'שגיאה במחיקת הפטנט'));
    } finally {
      setDeleting(false);
    }
  };

  const isCurrentDraft = !editId || getSubmissionStatus(previousPatentRef.current) === 'draft';
  const showDraftButton = userRole === 'RESEARCHER' && isCurrentDraft;
  const showDeleteButton =
    Boolean(editId) &&
    canDeletePatent(previousPatentRef.current) &&
    (userRole === 'ADMIN' || previousPatentRef.current?.researcherId === user?.id);

  const getCancelTarget = () =>
    editId ? `/patents/${editId}` : (userRole === 'RESEARCHER' ? '/' : '/patents');

  const handleCancel = () => {
    if (editId && !window.confirm(t('confirmCancelEdit', 'השינויים שביצעת לא יישמרו. האם לבטל את העריכה?'))) {
      return;
    }
    navigateBackOrFallback(navigate, getCancelTarget());
  };

  const isBusy = isSubmitting || deleting;

  return (
    <div className="page-container">
      <div className="page-content" style={{ maxWidth: '1200px' }}>
        <div className="form-page-header">
          <h1>{t('newPatentTitle', 'הוספת פטנט חדש')}</h1>
          <FormEditToolbar
            visible={Boolean(editId)}
            onCancelEdit={handleCancel}
            onDelete={handleDeletePatent}
            showDelete={showDeleteButton}
            deleting={deleting}
            deleteLabel={t('deletePatent', 'מחק פטנט')}
            t={t}
          />
        </div>
        <p className="form-subtitle">{t('newPatentSubtitle', 'בקשה לקניין רוחני (כמערכת גמול הצטיינות)')}</p>

        <form onSubmit={handleSubmit} className="research-form">
          {/* כותרת הפרוייקט */}
          <div className="form-section">
            <h2>פרטים כלליים</h2>
            <div className="form-group">
              <label>כותרת הפרוייקט שהוגש לפטנט *</label>
              <input
                type="text"
                name="projectTitle"
                value={formData.projectTitle}
                onChange={handleInputChange}
                className={errors.projectTitle ? 'error' : ''}
                required
              />
              {errors.projectTitle && <span className="error-message">{errors.projectTitle}</span>}
            </div>

            <div className="form-group">
              <label>אחוזי המוסד לפי ההסכם *</label>
              <select
                name="institutionPercentage"
                value={formData.institutionPercentage}
                onChange={handleInputChange}
                className={errors.institutionPercentage ? 'error' : ''}
                required
              >
                <option value="">בחר אחוז</option>
                {institutionPercentageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.institutionPercentage && <span className="error-message">{errors.institutionPercentage}</span>}
            </div>

            <div className="form-group">
              <label>קישור למחקר קיים</label>
              <select
                name="researchProposalId"
                value={formData.researchProposalId}
                onChange={handleInputChange}
                disabled={researchLoading}
              >
                <option value="">בחר מחקר מהרשימה</option>
                {researchOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.title}{userRole === 'ADMIN' ? ` - ${option.researcherName}` : ''}
                  </option>
                ))}
              </select>
              {researchLoadError && <span className="error-message">{researchLoadError}</span>}
            </div>
          </div>

          {/* שותפים */}
          <div className="form-section">
            <h2>שותפים לפטנט</h2>
            <div className="form-group">
              <label>האם קיימים שותפים לפטנט?</label>
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="hasPartners"
                    checked={hasPartners === true}
                    onChange={() => {
                      setHasPartners(true);
                      if (!formData.partners || formData.partners.length === 0) {
                        setFormData((prev) => ({
                          ...prev,
                          partners: [{ name: '', email: '', institution: '', percentage: '' }],
                        }));
                      }
                    }}
                  />
                  כן
                </label>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="hasPartners"
                    checked={hasPartners === false}
                    onChange={() => setHasPartners(false)}
                  />
                  לא
                </label>
              </div>
            </div>

            {hasPartners && formData.partners.map((partner, index) => (
              <div key={index} className="partner-group">
                <h3>שותף {index + 1}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>שם השותף</label>
                    <input
                      type="text"
                      value={partner.name}
                      onChange={(e) => handlePartnerChange(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>אימייל של השותף</label>
                    <input
                      type="email"
                      value={partner.email}
                      onChange={(e) => handlePartnerChange(index, 'email', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>המוסד של השותף</label>
                    <input
                      type="text"
                      value={partner.institution}
                      onChange={(e) => handlePartnerChange(index, 'institution', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>אחוזים מוסכמים לפי ההסכם</label>
                    <select
                      value={partner.percentage}
                      onChange={(e) => handlePartnerChange(index, 'percentage', e.target.value)}
                    >
                      <option value="">בחר אחוז</option>
                      {institutionPercentageOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {formData.partners.length > 1 && (
                  <button type="button" onClick={() => removePartner(index)} className="remove-btn">
                    הסר שותף
                  </button>
                )}
              </div>
            ))}
            {hasPartners && (
              <button type="button" onClick={addPartner} className="add-btn">
                + הוסף שותף
              </button>
            )}
          </div>

          {/* יחידת מסחור */}
          <div className="form-section">
            <h2>יחידת מסחור</h2>
            <div className="form-group">
              <label>שם יח' המסחור דרכה הוגשה הבקשה *</label>
              <select
                name="commercializationUnit"
                value={formData.commercializationUnit}
                onChange={handleInputChange}
                className={errors.commercializationUnit ? 'error' : ''}
                required
              >
                <option value="">בחר יחידת מסחור</option>
                {commercializationUnitOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.commercializationUnit && <span className="error-message">{errors.commercializationUnit}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>איש קשר של יח' המסחור 1</label>
                <input
                  type="text"
                  name="commercializationContact1"
                  value={formData.commercializationContact1}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>אימייל של איש הקשר 1</label>
                <input
                  type="email"
                  name="commercializationEmail1"
                  value={formData.commercializationEmail1}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>איש קשר של יח' המסחור 2</label>
                <input
                  type="text"
                  name="commercializationContact2"
                  value={formData.commercializationContact2}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>אימייל של איש הקשר 2</label>
                <input
                  type="email"
                  name="commercializationEmail2"
                  value={formData.commercializationEmail2}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* מסלול ותפקיד */}
          <div className="form-section">
            <h2>מסלול ותפקיד</h2>
            <div className="form-row">
              <div className="form-group">
                <label>מסלול ההגשה לקרן *</label>
                <select
                  name="submissionPath"
                  value={formData.submissionPath}
                  onChange={handleInputChange}
                  className={errors.submissionPath ? 'error' : ''}
                  required
                >
                  <option value="">בחר מסלול</option>
                  {submissionPathOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.submissionPath && <span className="error-message">{errors.submissionPath}</span>}
              </div>
              <div className="form-group">
                <label>תפקיד החוקר בהגשת הפטנט *</label>
                <select
                  name="researcherRole"
                  value={formData.researcherRole}
                  onChange={handleInputChange}
                  className={errors.researcherRole ? 'error' : ''}
                  required
                >
                  <option value="">בחר תפקיד</option>
                  {researcherRoleOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.researcherRole && <span className="error-message">{errors.researcherRole}</span>}
              </div>
            </div>
          </div>

          {/* סטטוס ושלב */}
          <div className="form-section">
            <h2>סטטוס ושלב</h2>
            <div className="form-row">
              <div className="form-group">
                <label>סטטוס הפטנט *</label>
                <select
                  name="patentStatus"
                  value={formData.patentStatus}
                  onChange={handleInputChange}
                  className={errors.patentStatus ? 'error' : ''}
                  required
                >
                  <option value="">בחר סטטוס</option>
                  {patentStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.patentStatus && <span className="error-message">{errors.patentStatus}</span>}
              </div>
              <div className="form-group">
                <label>שלב הפטנט *</label>
                <select
                  name="patentStage"
                  value={formData.patentStage}
                  onChange={handleInputChange}
                  className={errors.patentStage ? 'error' : ''}
                  required
                >
                  <option value="">בחר שלב</option>
                  {patentStageOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.patentStage && <span className="error-message">{errors.patentStage}</span>}
              </div>
            </div>
          </div>

          {/* זמני ביצוע - תאריכים */}
          <div className="form-section">
            <h2>זמני ביצוע - תאריכים</h2>
            <div className="dates-grid">
              {dateFields.map(({ key, label }) => (
                <div key={key} className="form-group">
                  <label>{label}</label>
                  <div className="date-input-group">
                    <input
                      type="text"
                      value={formData.dates[key]}
                      onChange={(e) => handleDateChange(key, e.target.value)}
                      className={key === 'submissionDate' && errors.submissionDate ? 'error' : ''}
                      required={key === 'submissionDate'}
                      placeholder="dd/mm/yyyy"
                      inputMode="numeric"
                      maxLength="10"
                      dir="ltr"
                    />
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <input
                        type="date"
                        ref={(el) => { datePickerRefs.current[key] = el; }}
                        value={convertDateToISO(formData.dates[key]) || ''}
                        onChange={(e) => handleDatePickerChange(key, e.target.value)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer',
                          zIndex: 2
                        }}
                        title="בחר תאריך מלוח שנה"
                      />
                      <div
                        style={{
                          cursor: 'pointer',
                          fontSize: '20px',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f8f9fa',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          minWidth: '40px',
                          height: '40px',
                          transition: 'all 0.2s',
                          margin: 0,
                          pointerEvents: 'none'
                        }}
                      >
                        📅
                      </div>
                    </div>
                    {formData.dates[key] && (
                      <a
                        href={generateOutlookCalendarLink(formData.dates[key], label)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="calendar-link"
                        title="הוסף ל-Outlook Calendar"
                      >
                        📅
                      </a>
                    )}
                  </div>
                  {key === 'submissionDate' && errors.submissionDate && (
                    <span className="error-message">{errors.submissionDate}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* תקציב */}
          <div className="form-section">
            <h2>תקציב</h2>

            {/* תקציב משוער לכל שלב */}
            <div className="form-group">
              <label>תקציב משוער לכל שלב</label>
              {patentStageOptions.map(stage => (
                <div key={stage.value} className="form-row" style={{ marginBottom: '10px' }}>
                  <label style={{ width: '200px', marginTop: '8px' }}>{stage.label}:</label>
                  <input
                    type="number"
                    value={formData.stageBudgets[stage.value] || ''}
                    onChange={(e) => handleStageBudgetChange(stage.value, e.target.value)}
                    placeholder="הכנס תקציב"
                    style={{ flex: 1 }}
                  />
                </div>
              ))}
              {errors.totalBudget && <span className="error-message">{errors.totalBudget}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>סה"כ תקציב (חישוב אוטומטי)</label>
                <input
                  type="number"
                  name="totalBudget"
                  value={formData.totalBudget}
                  readOnly
                  style={{ background: '#f5f5f5' }}
                />
              </div>
              <div className="form-group">
                <label>מטבע</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                >
                  {currencyOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>תקציב מתורגם (שקלים, חישוב אוטומטי)</label>
                <input
                  type="number"
                  name="convertedBudget"
                  value={formData.convertedBudget}
                  readOnly
                  style={{ background: '#f5f5f5' }}
                />
              </div>
            </div>
          </div>

          {/* מסמכים */}
          <div className="form-section">
            <h2>מסמכים</h2>
            <div className="form-group">
              <label>צ'קליסט מסמכים להגשה</label>
              <div className="documents-checklist-grid">
                {requiredDocuments.map((docName) => (
                  <DocumentChecklistCard
                    key={docName}
                    docName={docName}
                    files={formData.requiredDocumentsFiles?.[docName] || []}
                    onUpload={(files) => handleRequiredDocumentUpload(docName, files)}
                    onRemove={(fileIndex) => handleRemoveRequiredDocumentFile(docName, fileIndex)}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* חתימה דיגיטלית */}
          <div className="form-section">
            <h2>חתימה דיגיטלית</h2>
            <div className="form-group">
              <label>חתימת מורשי חתימה מוסדיים</label>
              {!formData.digitalSignature.signed ? (
                <button
                  type="button"
                  className="btn-signature"
                  onClick={handleDigitalSignature}
                >
                  חתימה דיגיטלית
                </button>
              ) : (
                <div className="signature-info">
                  <p>✓ חתום על ידי: {formData.digitalSignature.signer}</p>
                  <p>תאריך חתימה: {formData.digitalSignature.date}</p>
                </div>
              )}
            </div>
          </div>

          {/* הערות */}
          <div className="form-section">
            <h2>הערות</h2>
            <div className="form-group">
              <label>הערות (כתיבה חופשית)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={5}
                placeholder="הכנס הערות נוספות..."
              />
            </div>
          </div>

          {/* כפתורי שליחה */}
          <div className="form-actions">
            <div className="form-actions-start">
              <button type="button" onClick={handleCancel} className="cancel-btn" disabled={isBusy}>
                {t('cancel', 'ביטול')}
              </button>
              {showDeleteButton && (
                <button type="button" className="btn-delete" onClick={handleDeletePatent} disabled={isBusy}>
                  {deleting ? t('deleting', 'מוחק...') : t('deletePatent', 'מחק פטנט')}
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
                  : (userRole === 'RESEARCHER' ? t('submitPatent', 'הגש פטנט') : t('savePatent', 'שמור פטנט'))}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPatent;

