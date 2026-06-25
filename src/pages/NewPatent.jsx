import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, updateDoc, setDoc, writeBatch, serverTimestamp, Timestamp, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, storage } from '../services/firebase';
import { createNotification } from '../services/notifications';
import AIPolishButton from '../components/research/AIPolishButton';
import { navigateBackOrFallback } from '../utils/navigation';
import DocumentChecklistCard from '../components/research/form/DocumentChecklistCard';
import { canDeletePatent, getSubmissionStatus } from '../utils/submissionStatus';
import {
  PATENT_REQUIRED_DOCUMENT_DEFS,
  PATENT_REQUIRED_DOCUMENT_KEYS,
  normalizePatentDocumentsFiles,
  normalizePatentDocumentsChecklist,
  buildPatentDocumentsChecklist,
  buildPatentRequiredDocumentsFilesUrls,
  toPersistedPatentDocumentsMap,
  uploadPatentDocumentFile,
} from '../utils/patentRequiredDocuments';
import FormEditToolbar from '../components/FormEditToolbar';
import PatentDisclosureSection, {
  EMPTY_INVENTOR,
  EMPTY_FUNDING,
  EMPTY_PRIOR_PATENT,
  EMPTY_PRIOR_PUBLICATION,
} from '../components/research/form/PatentDisclosureSection';
import '../components/research/form/DocumentChecklistCard.css';
import './Page.css';
import './Research.css';

const INSTITUTION_PERCENTAGE_OPTIONS = ['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%'];

const SUBMISSION_PATH_DEFS = [
  { value: 'מסלול רגיל', labelKey: 'patentPathRegular' },
  { value: 'מסלול מהיר', labelKey: 'patentPathFast' },
  { value: 'מסלול בינלאומי', labelKey: 'patentPathInternational' },
  { value: 'מסלול מיוחד', labelKey: 'patentPathSpecial' },
];

const RESEARCHER_ROLE_DEFS = [
  { value: 'חוקר ראשי', labelKey: 'patentRolePrincipal' },
  { value: 'חוקר משנה', labelKey: 'patentRoleSecondary' },
];

const NewPatent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const { t, language } = useLanguage();
  const lang = language === 'en' ? 'en' : 'he';
  const editId = searchParams.get('edit');

  const commercializationUnitOptions = useMemo(
    () => Array.from({ length: 10 }, (_, i) => ({
      value: `יחידת מסחור ${i + 1}`,
      label: t(`commercializationUnit${i + 1}`, `יחידת מסחור ${i + 1}`),
    })),
    [t]
  );

  const submissionPathOptions = useMemo(
    () => SUBMISSION_PATH_DEFS.map((item) => ({ ...item, label: t(item.labelKey) })),
    [t]
  );

  const researcherRoleOptions = useMemo(
    () => RESEARCHER_ROLE_DEFS.map((item) => ({ ...item, label: t(item.labelKey) })),
    [t]
  );

  const patentStatusOptions = useMemo(() => [
    { value: 'in-process', label: t('inProcess', 'בהליך') },
    { value: 'registered', label: t('registered', 'רשום') },
    { value: 'approved', label: t('approved', 'אושר') },
  ], [t]);

  const patentStageOptions = useMemo(() => [
    { value: 'stage1', label: t('patentStage1') },
    { value: 'stage2', label: t('patentStage2') },
    { value: 'stage3', label: t('patentStage3') },
    { value: 'stage4', label: t('patentStage4') },
    { value: 'stage5', label: t('patentStage5') },
  ], [t]);

  const currencyOptions = useMemo(() => [
    { value: 'ILS', label: t('currencyILS') },
    { value: 'USD', label: t('currencyUSD') },
    { value: 'EUR', label: t('currencyEUR') },
  ], [t]);

  const dateFields = useMemo(() => [
    { key: 'submissionDate', label: t('patentDateSubmissionFull') },
    { key: 'initialReviewDate', label: t('patentDateInitialReview') },
    { key: 'examinationDate', label: t('patentDateExamination') },
    { key: 'approvalDate', label: t('patentDateApproval') },
    { key: 'registrationDate', label: t('patentDateRegistration') },
    { key: 'publicationDate', label: t('patentDatePublication') },
    { key: 'renewalDate', label: t('patentDateRenewal') },
    { key: 'expiryDate', label: t('patentDateExpiry') },
  ], [t]);

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
    notes: '',
    inventionTitleEnglish: '',
    inventionTitleHebrew: '',
    shortDescription: '',
    inventionTypeElaboration: '',
    potentialCustomers: '',
    commercialEntityContacts: '',
    inventors: [{ ...EMPTY_INVENTOR }],
    inventionFirstDate: '',
    inventionTimeFrame: '',
    inventionWorkType: '',
    fundingSupportType: '',
    fundingSources: [{ ...EMPTY_FUNDING }],
    nonJceMaterialsUsed: '',
    nonJceMaterialsDetails: '',
    hasBeenPublished: '',
    publicationDetails: '',
    futurePublicationPlans: '',
    priorPatentFiled: '',
    priorPatentDetails: '',
    literatureSurveyPerformed: '',
    literatureSurveyNotes: '',
    priorArtPatents: [{ ...EMPTY_PRIOR_PATENT }],
    priorArtPublications: [{ ...EMPTY_PRIOR_PUBLICATION }],
    scientificBackground: '',
    detailedDescription: '',
    advantagesOverExisting: '',
    potentialUsesAndImplementation: '',
    additionalResearchProgram: '',
    referenceList: '',
    developmentBudgetEstimate: '',
    developmentTimeEstimate: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [hasPartners, setHasPartners] = useState(false);
  const [hasInventors, setHasInventors] = useState(false);
  const [researchOptions, setResearchOptions] = useState([]);
  const [researchLoading, setResearchLoading] = useState(true);
  const [researchLoadError, setResearchLoadError] = useState('');
  const [existingResearcherId, setExistingResearcherId] = useState('');
  const isEdit = Boolean(editId);
  const datePickerRefs = useRef({});
  const inventionDatePickerRef = useRef(null);
  const previousPatentRef = useRef(null);
  const formDataRef = useRef(formData);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const updateFormData = (updater) => {
    setFormData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      formDataRef.current = next;
      return next;
    });
  };

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
      
      setFormData(prev => {
        const nextConverted = converted.toFixed(2);
        if (prev.convertedBudget === nextConverted) return prev;
        return { ...prev, convertedBudget: nextConverted };
      });
    }
  }, [formData.totalBudget, formData.currency]);

  // Calculate total budget automatically from stage budgets
  useEffect(() => {
    const total = Object.values(formData.stageBudgets || {}).reduce((sum, amount) => {
      const numAmount = parseFloat(amount) || 0;
      return sum + numAmount;
    }, 0);

    setFormData((prev) => {
      const nextTotal = total > 0 ? total.toString() : '';
      if (prev.totalBudget === nextTotal) return prev;
      return { ...prev, totalBudget: nextTotal };
    });
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
            title: data.projectTitle || data.title || t('noTitle', 'ללא כותרת'),
            researcherName: data.researcherName || data.researcher || t('researcher', 'חוקר')
          };
        });

        setResearchOptions(options);
      } catch (err) {
        console.error('Error loading research options:', err);
        setResearchLoadError(t('loadingResearchListError'));
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

        const normalizedFiles = toPersistedPatentDocumentsMap(data.requiredDocumentsFiles);
        const normalizedChecklist = {
          ...normalizePatentDocumentsChecklist(data.requiredDocumentsChecklist),
          ...buildPatentDocumentsChecklist(normalizedFiles),
        };

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
          requiredDocumentsChecklist: normalizedChecklist,
          requiredDocumentsFiles: normalizedFiles,
          digitalSignature: data.digitalSignature || { signed: false, date: '', signer: '' },
          notes: data.notes || '',
          inventionTitleEnglish: data.inventionTitleEnglish || '',
          inventionTitleHebrew: data.inventionTitleHebrew || '',
          shortDescription: data.shortDescription || '',
          inventionTypeElaboration: data.inventionTypeElaboration || '',
          potentialCustomers: data.potentialCustomers || '',
          commercialEntityContacts: data.commercialEntityContacts || '',
          inventors: (data.inventors && data.inventors.length > 0) ? data.inventors : [{ ...EMPTY_INVENTOR }],
          inventionFirstDate: convertToInputDate(data.inventionFirstDate),
          inventionTimeFrame: data.inventionTimeFrame || '',
          inventionWorkType: data.inventionWorkType || '',
          fundingSupportType: data.fundingSupportType || '',
          fundingSources: (data.fundingSources && data.fundingSources.length > 0) ? data.fundingSources : [{ ...EMPTY_FUNDING }],
          nonJceMaterialsUsed: data.nonJceMaterialsUsed || '',
          nonJceMaterialsDetails: data.nonJceMaterialsDetails || '',
          hasBeenPublished: data.hasBeenPublished || '',
          publicationDetails: data.publicationDetails || '',
          futurePublicationPlans: data.futurePublicationPlans || '',
          priorPatentFiled: data.priorPatentFiled || '',
          priorPatentDetails: data.priorPatentDetails || '',
          literatureSurveyPerformed: data.literatureSurveyPerformed || '',
          literatureSurveyNotes: data.literatureSurveyNotes || '',
          priorArtPatents: (data.priorArtPatents && data.priorArtPatents.length > 0) ? data.priorArtPatents : [{ ...EMPTY_PRIOR_PATENT }],
          priorArtPublications: (data.priorArtPublications && data.priorArtPublications.length > 0) ? data.priorArtPublications : [{ ...EMPTY_PRIOR_PUBLICATION }],
          scientificBackground: data.scientificBackground || '',
          detailedDescription: data.detailedDescription || '',
          advantagesOverExisting: data.advantagesOverExisting || '',
          potentialUsesAndImplementation: data.potentialUsesAndImplementation || '',
          additionalResearchProgram: data.additionalResearchProgram || '',
          referenceList: data.referenceList || '',
          developmentBudgetEstimate: data.developmentBudgetEstimate || '',
          developmentTimeEstimate: data.developmentTimeEstimate || '',
        }));

        setHasPartners(Boolean(data.partners && data.partners.length > 0));
        setHasInventors(
          Boolean(
            data.inventors?.length > 0
            && data.inventors.some((inv) => inv.name || inv.title || inv.nationalId || inv.department)
          )
        );
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

  const handleArrayFieldChange = (arrayKey, index, field, value) => {
    setFormData((prev) => {
      const next = [...(prev[arrayKey] || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, [arrayKey]: next };
    });
  };

  const addArrayRow = (arrayKey, emptyRow) => {
    setFormData((prev) => ({
      ...prev,
      [arrayKey]: [...(prev[arrayKey] || []), { ...emptyRow }],
    }));
  };

  const removeArrayRow = (arrayKey, index) => {
    setFormData((prev) => ({
      ...prev,
      [arrayKey]: (prev[arrayKey] || []).filter((_, i) => i !== index),
    }));
  };

  const handleInventionDateChange = (value) => {
    setFormData((prev) => ({ ...prev, inventionFirstDate: value }));
  };

  const handleInventionDatePickerChange = (isoDate) => {
    if (!isoDate) {
      handleInventionDateChange('');
      return;
    }
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) {
      handleInventionDateChange('');
      return;
    }
    handleInventionDateChange(`${day}/${month}/${year}`);
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

  const persistPatentDocuments = async (patentId, requiredDocumentsFiles, checklist) => {
    const persistedFiles = toPersistedPatentDocumentsMap(requiredDocumentsFiles);
    const finalChecklist = checklist || buildPatentDocumentsChecklist(persistedFiles);

    await updateDoc(doc(db, 'patents', patentId), {
      requiredDocumentsFiles: persistedFiles,
      requiredDocumentsChecklist: finalChecklist,
      updatedAt: serverTimestamp(),
    });

    updateFormData((prev) => ({
      ...prev,
      requiredDocumentsFiles: persistedFiles,
      requiredDocumentsChecklist: finalChecklist,
    }));

    previousPatentRef.current = {
      ...(previousPatentRef.current || {}),
      requiredDocumentsFiles: persistedFiles,
      requiredDocumentsChecklist: finalChecklist,
    };
  };

  const handleRequiredDocumentUpload = async (documentKey, selectedFiles) => {
    const files = Array.from(selectedFiles || []);
    if (files.length === 0) return;

    if (editId) {
      setDocumentsUploading(true);
      try {
        const currentMap = toPersistedPatentDocumentsMap(formDataRef.current.requiredDocumentsFiles);
        const existingForDoc = currentMap[documentKey] || [];
        const uploadedNew = [];

        for (const file of files) {
          if (!(file instanceof File)) continue;
          const meta = await uploadPatentDocumentFile({
            storage,
            patentId: editId,
            docKey: documentKey,
            file,
          });
          if (meta) uploadedNew.push(meta);
        }

        const nextFiles = {
          ...currentMap,
          [documentKey]: [...existingForDoc, ...uploadedNew],
        };
        await persistPatentDocuments(
          editId,
          nextFiles,
          buildPatentDocumentsChecklist(nextFiles)
        );
      } catch (uploadError) {
        console.error('Error uploading patent document:', uploadError);
        alert(
          t('documentUploadError', 'העלאת הקובץ נכשלה. נסו שוב.')
          + (uploadError?.message ? ` (${uploadError.message})` : '')
        );
      } finally {
        setDocumentsUploading(false);
      }
      return;
    }

    updateFormData((prev) => ({
      ...prev,
      requiredDocumentsFiles: {
        ...prev.requiredDocumentsFiles,
        [documentKey]: [...(prev.requiredDocumentsFiles?.[documentKey] || []), ...files],
      },
      requiredDocumentsChecklist: {
        ...prev.requiredDocumentsChecklist,
        [documentKey]: true,
      },
    }));
  };

  const handleRemoveRequiredDocumentFile = async (documentKey, fileIndex) => {
    if (editId) {
      setDocumentsUploading(true);
      try {
        const currentMap = toPersistedPatentDocumentsMap(formDataRef.current.requiredDocumentsFiles);
        const nextForDoc = [...(currentMap[documentKey] || [])];
        nextForDoc.splice(fileIndex, 1);
        const nextFiles = { ...currentMap, [documentKey]: nextForDoc };
        await persistPatentDocuments(
          editId,
          nextFiles,
          buildPatentDocumentsChecklist(nextFiles)
        );
      } catch (removeError) {
        console.error('Error removing patent document:', removeError);
        alert(t('documentRemoveError', 'שגיאה בהסרת הקובץ'));
      } finally {
        setDocumentsUploading(false);
      }
      return;
    }

    updateFormData((prev) => {
      const currentFiles = [...(prev.requiredDocumentsFiles?.[documentKey] || [])];
      currentFiles.splice(fileIndex, 1);

      return {
        ...prev,
        requiredDocumentsFiles: {
          ...prev.requiredDocumentsFiles,
          [documentKey]: currentFiles,
        },
        requiredDocumentsChecklist: {
          ...prev.requiredDocumentsChecklist,
          [documentKey]: currentFiles.length > 0,
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
        signer: user?.name || t('digitalSignatureDefault', 'חתימה דיגיטלית'),
      },
    }));
  };

  const generateOutlookCalendarLink = (date, title) => {
    if (!date) return '';
    const isoDate = convertDateToISO(date);
    if (!isoDate) return '';
    const dateStr = new Date(isoDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const encodedTitle = encodeURIComponent(title || t('patentCalendarEvent', 'תאריך פטנט'));
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedTitle}&startdt=${dateStr}&enddt=${dateStr}`;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectTitle.trim()) {
      newErrors.projectTitle = t('errPatentProjectTitleRequired');
    }
    if (!formData.institutionPercentage) {
      newErrors.institutionPercentage = t('errPatentInstitutionPercentage');
    }
    if (!formData.commercializationUnit) {
      newErrors.commercializationUnit = t('errPatentCommercializationUnit');
    }
    if (!formData.submissionPath) {
      newErrors.submissionPath = t('errPatentSubmissionPath');
    }
    if (!formData.researcherRole) {
      newErrors.researcherRole = t('errPatentResearcherRole');
    }
    if (!formData.patentStatus) {
      newErrors.patentStatus = t('errPatentStatus');
    }
    if (!formData.patentStage) {
      newErrors.patentStage = t('errPatentStage');
    }
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!formData.dates.submissionDate) {
      newErrors.submissionDate = t('errPatentSubmissionDateRequired');
    } else if (!datePattern.test(formData.dates.submissionDate)) {
      newErrors.submissionDate = t('errInvalidDateFormat');
    } else if (!convertDateToISO(formData.dates.submissionDate)) {
      newErrors.submissionDate = t('errInvalidDate');
    }
    const hasStageBudget = Object.values(formData.stageBudgets || {}).some((amount) => {
      const numAmount = parseFloat(amount) || 0;
      return numAmount > 0;
    });
    if (!hasStageBudget) {
      newErrors.totalBudget = t('errPatentBudgetRequired');
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
      alert(t('fillRequiredFields', 'יש למלא את כל השדות החובה'));
      return;
    }

    setIsSubmitting(true);

    try {
      const wasDraft = getSubmissionStatus(previousPatentRef.current) === 'draft';
      const researcherId = user?.id || 'temp-user-id';
      const researcherName = user?.name || t('researcher', 'חוקר');

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

      const fd = formDataRef.current;
      const linkedResearch = fd.researchProposalId
        ? researchOptions.find(option => option.id === fd.researchProposalId)
        : null;

      const previousRequiredFiles = toPersistedPatentDocumentsMap(
        previousPatentRef.current?.requiredDocumentsFiles
      );
      const persistedFromForm = toPersistedPatentDocumentsMap(fd.requiredDocumentsFiles);
      const hasPendingLocalFiles = Object.values(
        normalizePatentDocumentsFiles(fd.requiredDocumentsFiles)
      ).some((entries) => entries.some((item) => item instanceof File));

      let docId = editId;
      if (!docId) {
        docId = doc(collection(db, 'patents')).id;
      }

      let requiredDocumentsFilesUrls;
      try {
        if (isEdit && !hasPendingLocalFiles) {
          requiredDocumentsFilesUrls = {
            ...previousRequiredFiles,
            ...persistedFromForm,
          };
        } else {
          requiredDocumentsFilesUrls = await buildPatentRequiredDocumentsFilesUrls({
            formFiles: normalizePatentDocumentsFiles(fd.requiredDocumentsFiles),
            previousFiles: previousRequiredFiles,
            docKeys: PATENT_REQUIRED_DOCUMENT_KEYS,
            patentId: docId,
            storage,
          });
          requiredDocumentsFilesUrls = {
            ...previousRequiredFiles,
            ...toPersistedPatentDocumentsMap(requiredDocumentsFilesUrls),
          };
        }
      } catch (requiredDocsError) {
        console.error('Error uploading required patent documents:', requiredDocsError);
        throw new Error(t('documentUploadError', 'שגיאה בהעלאת קבצי המסמכים. נסו שוב.'));
      }

      const requiredDocumentsChecklistFromFiles = buildPatentDocumentsChecklist(
        requiredDocumentsFilesUrls
      );

      const patentData = {
        // פרטים כלליים
        title: fd.projectTitle,
        projectTitle: fd.projectTitle,
        researchProposalId: fd.researchProposalId || null,
        researchProposalTitle: linkedResearch?.title || '',
        
        // אחוזי המוסד
        institutionPercentage: fd.institutionPercentage,
        
        // שותפים
        partners: hasPartners
          ? fd.partners.filter(p => p.name || p.email || p.institution || p.percentage)
          : [],
        
        // יחידת מסחור
        commercializationUnit: fd.commercializationUnit,
        commercializationContact1: fd.commercializationContact1,
        commercializationContact2: fd.commercializationContact2,
        commercializationEmail1: fd.commercializationEmail1,
        commercializationEmail2: fd.commercializationEmail2,
        
        // מסלול ותפקיד
        submissionPath: fd.submissionPath,
        researcherRole: fd.researcherRole,
        
        // סטטוס ושלב
        status: fd.patentStatus,
        patentStage: fd.patentStage,
        
        // תאריכים
        ...datesTimestamps,
        registrationDate: datesTimestamps.registrationDate || datesTimestamps.submissionDate || serverTimestamp(),
        
        // תקציב
        totalBudget: fd.totalBudget || '',
        currency: fd.currency || 'ILS',
        convertedBudget: fd.convertedBudget || '',
        stageBudgets: fd.stageBudgets || {},
        
        // מסמכים
        requiredDocumentsChecklist: requiredDocumentsChecklistFromFiles,
        requiredDocumentsFiles: requiredDocumentsFilesUrls,
        
        // חתימה
        digitalSignature: fd.digitalSignature || { signed: false, signer: '', date: null },
        
        // הערות
        notes: fd.notes || '',

        // טופס גילוי המצאה (DOI)
        inventionTitleEnglish: fd.inventionTitleEnglish || '',
        inventionTitleHebrew: fd.inventionTitleHebrew || '',
        shortDescription: fd.shortDescription || '',
        inventionTypeElaboration: fd.inventionTypeElaboration || '',
        potentialCustomers: fd.potentialCustomers || '',
        commercialEntityContacts: fd.commercialEntityContacts || '',
        inventors: hasInventors
          ? (fd.inventors || []).filter((inv) => inv.name || inv.title || inv.nationalId || inv.department)
          : [],
        inventionFirstDate: fd.inventionFirstDate
          ? (() => {
              const iso = convertDateToISO(fd.inventionFirstDate);
              return iso ? Timestamp.fromDate(new Date(iso)) : null;
            })()
          : null,
        inventionTimeFrame: fd.inventionTimeFrame || '',
        inventionWorkType: fd.inventionWorkType || '',
        fundingSupportType: fd.fundingSupportType || '',
        fundingSources: (fd.fundingSources || []).filter((row) => row.source || row.grantNumber || row.supportPeriod),
        nonJceMaterialsUsed: fd.nonJceMaterialsUsed || '',
        nonJceMaterialsDetails: fd.nonJceMaterialsDetails || '',
        hasBeenPublished: fd.hasBeenPublished || '',
        publicationDetails: fd.publicationDetails || '',
        futurePublicationPlans: fd.futurePublicationPlans || '',
        priorPatentFiled: fd.priorPatentFiled || '',
        priorPatentDetails: fd.priorPatentDetails || '',
        literatureSurveyPerformed: fd.literatureSurveyPerformed || '',
        literatureSurveyNotes: fd.literatureSurveyNotes || '',
        priorArtPatents: (fd.priorArtPatents || []).filter((row) => row.title || row.publicationNumber || row.country),
        priorArtPublications: (fd.priorArtPublications || []).filter((row) => row.title || row.authors),
        scientificBackground: fd.scientificBackground || '',
        detailedDescription: fd.detailedDescription || '',
        advantagesOverExisting: fd.advantagesOverExisting || '',
        potentialUsesAndImplementation: fd.potentialUsesAndImplementation || '',
        additionalResearchProgram: fd.additionalResearchProgram || '',
        referenceList: fd.referenceList || '',
        developmentBudgetEstimate: fd.developmentBudgetEstimate || '',
        developmentTimeEstimate: fd.developmentTimeEstimate || '',
        
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

      if (isEdit) {
        await updateDoc(doc(db, 'patents', docId), patentData);
      } else {
        await setDoc(doc(db, 'patents', docId), patentData);
        console.log('Document created with ID:', docId);
      }

      updateFormData((prev) => ({
        ...prev,
        requiredDocumentsFiles: toPersistedPatentDocumentsMap(requiredDocumentsFilesUrls),
        requiredDocumentsChecklist: requiredDocumentsChecklistFromFiles,
      }));

      previousPatentRef.current = {
        ...(previousPatentRef.current || {}),
        ...patentData,
        requiredDocumentsFiles: requiredDocumentsFilesUrls,
      };

      if (!asDraft && docId && fd.researchProposalId) {
        try {
          await updateDoc(doc(db, 'researchProposals', fd.researchProposalId), {
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
      alert(t('savePatentSuccess'));
      navigate(userRole === 'RESEARCHER' ? '/' : '/patents');
    } catch (error) {
      console.error('Error saving patent:', error);
      alert(`${t('savePatentError')}: ${error.message || t('loadPatentError', 'שגיאה לא ידועה')}`);
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

  const handleHasInventorsYes = () => {
    setHasInventors(true);
    setFormData((prev) => {
      if (prev.inventors?.length > 0) return prev;
      return { ...prev, inventors: [{ ...EMPTY_INVENTOR }] };
    });
  };

  const handleHasPartnersYes = () => {
    setHasPartners(true);
    setFormData((prev) => {
      if (prev.partners?.length > 0) return prev;
      return { ...prev, partners: [{ name: '', email: '', institution: '', percentage: '' }] };
    });
  };

  const isBusy = isSubmitting || deleting || documentsUploading;

  return (
    <div className="page-container">
      <div className="page-content" style={{ maxWidth: '1200px' }}>
        <div className="form-page-header">
          <h1>{t('newPatentTitle', 'הוספת פטנט חדש')}</h1>
          <FormEditToolbar
            visible={Boolean(editId)}
            onCancelEdit={handleCancel}
            deleting={deleting}
            t={t}
          />
        </div>
        <p className="form-subtitle">{t('newPatentSubtitle', 'בקשה לקניין רוחני (כמערכת גמול הצטיינות)')}</p>

        <form onSubmit={handleSubmit} className="research-form">
          {/* כותרת הפרוייקט */}
          <div className="form-section">
            <h2>{t('generalDetails', 'פרטים כלליים')}</h2>
            <div className="form-group">
              <label>{t('patentProjectTitleLabel')} *</label>
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
              <label>{t('patentInstitutionPercentageLabel')} *</label>
              <select
                name="institutionPercentage"
                value={formData.institutionPercentage}
                onChange={handleInputChange}
                className={errors.institutionPercentage ? 'error' : ''}
                required
              >
                <option value="">{t('selectPercentage')}</option>
                {INSTITUTION_PERCENTAGE_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.institutionPercentage && <span className="error-message">{errors.institutionPercentage}</span>}
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
          </div>

          <PatentDisclosureSection
            formData={formData}
            handleChange={handleInputChange}
            hasInventors={hasInventors}
            setHasInventors={setHasInventors}
            onHasInventorsYes={handleHasInventorsYes}
            handleInventorChange={(index, field, value) => handleArrayFieldChange('inventors', index, field, value)}
            addInventor={() => addArrayRow('inventors', EMPTY_INVENTOR)}
            removeInventor={(index) => removeArrayRow('inventors', index)}
            handleFundingSourceChange={(index, field, value) => handleArrayFieldChange('fundingSources', index, field, value)}
            addFundingSource={() => addArrayRow('fundingSources', EMPTY_FUNDING)}
            removeFundingSource={(index) => removeArrayRow('fundingSources', index)}
            handlePriorArtPatentChange={(index, field, value) => handleArrayFieldChange('priorArtPatents', index, field, value)}
            addPriorArtPatent={() => addArrayRow('priorArtPatents', EMPTY_PRIOR_PATENT)}
            removePriorArtPatent={(index) => removeArrayRow('priorArtPatents', index)}
            handlePriorArtPublicationChange={(index, field, value) => handleArrayFieldChange('priorArtPublications', index, field, value)}
            addPriorArtPublication={() => addArrayRow('priorArtPublications', EMPTY_PRIOR_PUBLICATION)}
            removePriorArtPublication={(index) => removeArrayRow('priorArtPublications', index)}
            handleInventionDateChange={handleInventionDateChange}
            handleInventionDatePickerChange={handleInventionDatePickerChange}
            convertDateToISO={convertDateToISO}
            inventionDatePickerRef={inventionDatePickerRef}
            onPolish={(improved) => setFormData((prev) => ({ ...prev, ...improved }))}
          />

          {/* שותפים */}
          <div className="form-section">
            <h2>{t('patentPartnersTitle')}</h2>
            <div className="form-group">
              <label>{t('patentHasPartnersQuestion')}</label>
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="hasPartners"
                    checked={hasPartners === true}
                    onChange={handleHasPartnersYes}
                  />
                  {t('yes', 'כן')}
                </label>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="hasPartners"
                    checked={hasPartners === false}
                    onChange={() => setHasPartners(false)}
                  />
                  {t('no', 'לא')}
                </label>
              </div>
            </div>

            {hasPartners && formData.partners.map((partner, index) => (
              <div key={index} className="partner-group">
                <h3>{t('partner', 'שותף')} {index + 1}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('partnerName', 'שם השותף')}</label>
                    <input
                      type="text"
                      value={partner.name}
                      onChange={(e) => handlePartnerChange(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('partnerEmail', 'אימייל של השותף')}</label>
                    <input
                      type="email"
                      value={partner.email}
                      onChange={(e) => handlePartnerChange(index, 'email', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('partnerInstitution', 'המוסד של השותף')}</label>
                    <input
                      type="text"
                      value={partner.institution}
                      onChange={(e) => handlePartnerChange(index, 'institution', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('patentPartnerPercentage')}</label>
                    <select
                      value={partner.percentage}
                      onChange={(e) => handlePartnerChange(index, 'percentage', e.target.value)}
                    >
                      <option value="">{t('selectPercentage')}</option>
                      {INSTITUTION_PERCENTAGE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {formData.partners.length > 1 && (
                  <button type="button" onClick={() => removePartner(index)} className="remove-btn">
                    {t('removePartner')}
                  </button>
                )}
              </div>
            ))}
            {hasPartners && (
              <button type="button" onClick={addPartner} className="add-btn">
                + {t('addPartner', 'הוסף שותף')}
              </button>
            )}
          </div>

          <div className="form-section">
            <h2>{t('commercializationUnitTitle')}</h2>
            <div className="form-group">
              <label>{t('commercializationUnitSelectLabel')} *</label>
              <select
                name="commercializationUnit"
                value={formData.commercializationUnit}
                onChange={handleInputChange}
                className={errors.commercializationUnit ? 'error' : ''}
                required
              >
                <option value="">{t('selectCommercializationUnit')}</option>
                {commercializationUnitOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.commercializationUnit && <span className="error-message">{errors.commercializationUnit}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('commercializationContact1Label')}</label>
                <input
                  type="text"
                  name="commercializationContact1"
                  value={formData.commercializationContact1}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>{t('commercializationEmail1Label')}</label>
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
                <label>{t('commercializationContact2Label')}</label>
                <input
                  type="text"
                  name="commercializationContact2"
                  value={formData.commercializationContact2}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>{t('commercializationEmail2Label')}</label>
                <input
                  type="email"
                  name="commercializationEmail2"
                  value={formData.commercializationEmail2}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>{t('patentPathAndRoleTitle')}</h2>
            <div className="form-row">
              <div className="form-group">
                <label>{t('patentSubmissionPathLabel')} *</label>
                <select
                  name="submissionPath"
                  value={formData.submissionPath}
                  onChange={handleInputChange}
                  className={errors.submissionPath ? 'error' : ''}
                  required
                >
                  <option value="">{t('selectPath', 'בחרו מסלול')}</option>
                  {submissionPathOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.submissionPath && <span className="error-message">{errors.submissionPath}</span>}
              </div>
              <div className="form-group">
                <label>{t('patentResearcherRoleLabel')} *</label>
                <select
                  name="researcherRole"
                  value={formData.researcherRole}
                  onChange={handleInputChange}
                  className={errors.researcherRole ? 'error' : ''}
                  required
                >
                  <option value="">{t('selectRole', 'בחרו תפקיד')}</option>
                  {researcherRoleOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.researcherRole && <span className="error-message">{errors.researcherRole}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>{t('patentStatusAndStageTitle')}</h2>
            <div className="form-row">
              <div className="form-group">
                <label>{t('patentStatusLabel')} *</label>
                <select
                  name="patentStatus"
                  value={formData.patentStatus}
                  onChange={handleInputChange}
                  className={errors.patentStatus ? 'error' : ''}
                  required
                >
                  <option value="">{t('selectStatus')}</option>
                  {patentStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.patentStatus && <span className="error-message">{errors.patentStatus}</span>}
              </div>
              <div className="form-group">
                <label>{t('patentStage', 'שלב הפטנט')} *</label>
                <select
                  name="patentStage"
                  value={formData.patentStage}
                  onChange={handleInputChange}
                  className={errors.patentStage ? 'error' : ''}
                  required
                >
                  <option value="">{t('selectStage')}</option>
                  {patentStageOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.patentStage && <span className="error-message">{errors.patentStage}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>{t('patentTimelineTitle')}</h2>
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
                        title={t('chooseDate', 'בחר תאריך מלוח שנה')}
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
                        title={t('addToOutlookCalendar')}
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

          <div className="form-section">
            <h2>{t('patentBudgetTitle')}</h2>

            <div className="form-group">
              <label>{t('patentBudgetPerStage')}</label>
              {patentStageOptions.map(stage => (
                <div key={stage.value} className="form-row" style={{ marginBottom: '10px' }}>
                  <label style={{ width: '200px', marginTop: '8px' }}>{stage.label}:</label>
                  <input
                    type="number"
                    value={formData.stageBudgets[stage.value] || ''}
                    onChange={(e) => handleStageBudgetChange(stage.value, e.target.value)}
                    placeholder={t('enterBudget')}
                    style={{ flex: 1 }}
                  />
                </div>
              ))}
              {errors.totalBudget && <span className="error-message">{errors.totalBudget}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('patentTotalBudget')}</label>
                <input
                  type="number"
                  name="totalBudget"
                  value={formData.totalBudget}
                  readOnly
                  style={{ background: '#f5f5f5' }}
                />
              </div>
              <div className="form-group">
                <label>{t('budgetCurrency', 'מטבע התקציב')}</label>
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
                <label>{t('patentConvertedBudget')}</label>
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

          <div className="form-section">
            <h2>{t('patentDocumentsTitle')}</h2>
            <div className="form-group">
              <label>{t('patentDocumentsChecklist')}</label>
              {documentsUploading && (
                <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '14px' }}>
                  {t('uploadingFiles', 'מעלה קבצים...')}
                </p>
              )}
              <div className="documents-checklist-grid">
                {PATENT_REQUIRED_DOCUMENT_DEFS.map(({ labelKey, fallback }) => (
                  <DocumentChecklistCard
                    key={labelKey}
                    docName={labelKey}
                    displayLabel={t(labelKey, fallback)}
                    files={formData.requiredDocumentsFiles?.[labelKey] || []}
                    onUpload={(files) => handleRequiredDocumentUpload(labelKey, files)}
                    onRemove={(fileIndex) => handleRemoveRequiredDocumentFile(labelKey, fileIndex)}
                    disabled={documentsUploading}
                  />
                ))}
              </div>
            </div>

          </div>

          <div className="form-section">
            <h2>{t('digitalSignatureTitle', 'חתימה דיגיטלית')}</h2>
            <div className="form-group">
              <label>{t('institutionalSignatures', 'חתימת מורשי חתימה מוסדיים')}</label>
              {!formData.digitalSignature.signed ? (
                <button
                  type="button"
                  className="btn-signature"
                  onClick={handleDigitalSignature}
                >
                  {t('digitalSignButton', 'חתימה דיגיטלית')}
                </button>
              ) : (
                <div className="signature-info">
                  <p>✓ {t('signedBy', 'חתום על ידי')}: {formData.digitalSignature.signer}</p>
                  <p>{t('signatureDate', 'תאריך חתימה')}: {formData.digitalSignature.date}</p>
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>{t('notesTitle')}</h2>
              <AIPolishButton
                fields={{ notes: formData.notes }}
                fieldLabels={{ notes: t('notesFreeText', 'הערות (כתיבה חופשית)') }}
                onApply={(improved) => setFormData((prev) => ({ ...prev, ...improved }))}
                lang={lang}
              />
            </div>
            <div className="form-group">
              <label>{t('notesFreeText', 'הערות (כתיבה חופשית)')}</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={5}
                placeholder={t('enterAdditionalNotes')}
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

