import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, updateDoc, setDoc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, storage } from '../services/firebase';
import { createNotification } from '../services/notifications';
import BasicInfoSection from '../components/research/form/BasicInfoSection';
import ResearchPeriodSection from '../components/research/form/ResearchPeriodSection';
import BudgetSection from '../components/research/form/BudgetSection';
import PartnersSection from '../components/research/form/PartnersSection';
import ResearchDescriptionSection from '../components/research/form/ResearchDescriptionSection';
import BibliographySection from '../components/research/form/BibliographySection';
import DocumentsSection from '../components/research/form/DocumentsSection';
import DigitalSignatureSection from '../components/research/form/DigitalSignatureSection';
import AdditionalInfoSection from '../components/research/form/AdditionalInfoSection';
import ResearchProposalReviewAssistant from '../components/research/ResearchProposalReviewAssistant';
import FormEditToolbar from '../components/FormEditToolbar';
import WorkPlanSection from '../components/research/WorkPlanSection';
import ProposalDocxUpload from '../components/research/ProposalDocxUpload';
import { getHebrewAcademicYearFromDate, normalizeAcademicYear } from '../utils/academicYear';
import { canDeleteResearch, getSubmissionStatus } from '../utils/submissionStatus';
import { navigateBackOrFallback } from '../utils/navigation';
import {
  REQUIRED_DOCUMENT_KEYS,
  REQUIRED_DOCUMENT_FALLBACKS,
  normalizeRequiredDocumentsFiles,
  normalizeRequiredDocumentsChecklist,
  buildRequiredDocumentsChecklist,
  buildRequiredDocumentsFilesUrls,
  toPersistedRequiredDocumentsMap,
  uploadRequiredDocumentFile,
} from '../utils/requiredDocuments';
import {
  exportPrintableHtmlToPdf,
  escapeHtml,
  buildResearchProposalHeader,
  buildMetaSection,
  buildMetaTable,
  buildFormFieldBlock,
  buildSectionHeading,
  buildDocFooter,
} from '../utils/exportPdf';
import './Page.css';
import './Research.css';

const NewResearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const { t, language } = useLanguage();
  const editId = searchParams.get('edit');
  
  // Options for dropdowns
  const fundOptions = [
    'הקרן הלאומית למדע ISF - Israeli Science Foundation',
    'הקרן הדו-לאומית למדע BSF - Binational Science Foundation',
    'הקרן הגרמנית-ישראלית למחקר ופיתוח GIF - German-Israeli Foundation',
    'האיחוד האירופי Horizon',
    'משרד החדשנות, המדע והטכנולוגיה MOST',
    'משרד הבריאות MOH',
    'המכון הלאומי לבריאות (ארה"ב) - NIH National Institute of Health',
    'הקרן לחקר הסרטן ICRF',
    'הקרן הדו-לאומית למחקר ופיתוח חקלאי BARD',
    'שיתוף פעולה גרמניה-ישראל DIP',
    'הקרן הגרמנית למחקר DFG',
    'HFSP - Human Frontiers Science Project',
    'רשות המים - המדען הראשי',
    'רשות האנרגיה והתשתיות - המדען הראשי',
    'המשרד לאיכות הסביבה - המדען הראשי',
    'משרד החקלאות וההתיישבות הכפרית / מכון וולקני',
    'האגודה למלחמה בסרטן',
    'אלו"ט',
    'קרן "שלם"',
    'Volfswagen Stiftung',
    'Spencer Foundation for Research in Education',
    'קרן קיימת לישראל קק"ל',
    'מו"פ מדבר יהודה וים המלח',
    'המרכז למחקרי סביבה וקיימות',
    'קרן פזי',
    'מכון אלי הורביץ לניהול אסטרטגי',
    'מרכז לדאטה ובינה מלאכותית - אונ\' תל אביב',
    'קרן אחרת'
  ];

  const submissionPathOptions = [
    'לאומי',
    'בינלאומי',
    'שת"פ משרדים ממשלתיים',
    'אחר'
  ];

  const researcherRoleOptions = [
    'חוקר ראשי',
    'חוקר משנה',
    'שותף',
    'יועץ'
  ];

  const proposalStageOptions = [
    'קדם הצעה',
    'הצעה מלאה'
  ];

  const submissionTypeOptions = [
    'שלב אחד',
    'דו-שלבי',
    'רב שלבי',
    'אחר'
  ];

  const fundTypeOptions = [
    'תחרותי',
    'ממשלתי',
    'עמותה / קהילה',
    'בינלאומי',
    'מרכזי מחקר',
    'תשתיות מחקר'
  ];

  const currencyOptions = [
    { value: 'ILS', label: '₪ (שקל)' },
    { value: 'USD', label: '$ (דולר)' },
    { value: 'EUR', label: '€ (אירו)' }
  ];

  const budgetComponents = [
    t('budgetPersonnel', 'כוח אדם'),
    t('budgetEquipment', 'ציוד קבוע'),
    t('budgetConsumables', 'חומרים וציוד מתכלה'),
    t('budgetComputers', 'מחשבים'),
    t('budgetTravel', 'נסיעות לחו"ל'),
    t('budgetConferences', 'כנסים'),
    t('budgetPatents', 'פטנטים'),
    t('budgetMisc', 'שונות'),
    t('budgetOverhead', 'תקורה'),
  ];

  const requiredDocuments = REQUIRED_DOCUMENT_KEYS.map((key) => ({
    key,
    label: t(key, REQUIRED_DOCUMENT_FALLBACKS[key]),
  }));

  const [formData, setFormData] = useState({
    projectTitle: '',
    fundName: '',
    fundType: '',
    submissionPath: '',
    researcherRole: '',
    proposalStage: '',
    submissionType: '',
    researchStartDate: '',
    researchEndDate: '',
    researchDurationYears: '',
    academicYear: '',
    totalBudget: '',
    currency: 'ILS',
    convertedBudget: '',
    budgetComponents: {},
    partners: [{ name: '', email: '', institution: '', country: '' }],
    requiredDocumentsChecklist: {},
    requiredDocumentsFiles: {},
    digitalSignature: { signed: false, date: '', signer: '' },
    expectedResponseDate: '',
    notes: '',
    abstract: '',
    scientificBackground: '',
    researchObjectives: '',
    detailedDescription: '',
    significanceInnovation: '',
    applicability: '',
    principalInvestigatorName: '',
    biographicalSummaryName: '',
    biographicalSummaryPositionTitle: '',
    bibliographyEducationTraining: [{ institutionLocation: '', degree: '', monthYear: '', fieldOfStudy: '' }],
    bibliographyPersonalStatement: '',
    bibliographyPositionsAndHonors: '',
    bibliographySelectedPublications: '',
    bibliographyResearchSupport: '',
    workPlanTasks: []
  });

  const [errors, setErrors] = useState({});
  const [hasPartners, setHasPartners] = useState(false);
  const [existingResearcherId, setExistingResearcherId] = useState('');
  const previousResearchRef = useRef(null);
  const formDataRef = useRef(formData);
  const formDirtyRef = useRef(false);

  const updateFormData = useCallback((updater) => {
    setFormData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      formDataRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    formDirtyRef.current = false;
  }, [editId]);

  const markFormDirty = () => {
    formDirtyRef.current = true;
  };

  const normalizeBibliographyRowsForSave = (rows) =>
    (Array.isArray(rows) ? rows : []).map((row) => ({
      institutionLocation: String(row?.institutionLocation ?? ''),
      degree: String(row?.degree ?? ''),
      monthYear: String(row?.monthYear ?? ''),
      fieldOfStudy: String(row?.fieldOfStudy ?? ''),
    }));
  
  // Refs for date pickers
  const startDatePickerRef = useRef(null);
  const endDatePickerRef = useRef(null);
  const expectedDatePickerRef = useRef(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [workPlanKey, setWorkPlanKey] = useState(0);

  // Normalize work-plan tasks so edit mode can load both old/new schemas.
  const normalizeWorkPlanTasks = (tasks) => {
    if (!Array.isArray(tasks)) return [];

    return tasks.map((task, index) => {
      const rawStart =
        task?.startMonth ??
        task?.start_month ??
        task?.fromMonth ??
        task?.monthStart ??
        task?.start ??
        task?.from ??
        1;
      const rawEnd =
        task?.endMonth ??
        task?.end_month ??
        task?.toMonth ??
        task?.monthEnd ??
        task?.end ??
        task?.to ??
        rawStart;

      const startMonthParsed = Number(rawStart);
      const endMonthParsed = Number(rawEnd);

      const startMonth = Number.isFinite(startMonthParsed) && startMonthParsed > 0 ? startMonthParsed : 1;
      const endMonth =
        Number.isFinite(endMonthParsed) && endMonthParsed >= startMonth
          ? endMonthParsed
          : startMonth;

      return {
        id: task?.id || `task-${Date.now()}-${index}`,
        title:
          task?.title ||
          task?.taskTitle ||
          task?.name ||
          task?.taskName ||
          task?.label ||
          '',
        startMonth,
        endMonth,
      };
    });
  };

  // Calculate research duration automatically
  useEffect(() => {
    if (formData.researchStartDate && formData.researchEndDate) {
      const startDateISO = convertDateToISO(formData.researchStartDate);
      const endDateISO = convertDateToISO(formData.researchEndDate);
      
      if (startDateISO && endDateISO) {
        const start = new Date(startDateISO);
        const end = new Date(endDateISO);
        
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const diffYears = (diffDays / 365).toFixed(2);
          
          updateFormData(prev => ({
            ...prev,
            researchDurationYears: diffYears
          }));

          // Calculate academic year
          const academicYear = getHebrewAcademicYearFromDate(start);
          updateFormData(prev => ({
            ...prev,
            academicYear: academicYear
          }));
        }
      }
    }
  }, [formData.researchStartDate, formData.researchEndDate]);

  // Calculate total budget from components
  useEffect(() => {
    const total = Object.values(formData.budgetComponents || {}).reduce((sum, amount) => {
      const numAmount = parseFloat(amount) || 0;
      return sum + numAmount;
    }, 0);
    
    if (total > 0) {
      updateFormData(prev => ({
        ...prev,
        totalBudget: total.toString()
      }));
    }
  }, [formData.budgetComponents]);

  // Helper to convert Firestore Timestamp or date string to dd/mm/yyyy for display
  const timestampToDisplayDate = (value) => {
    if (!value) return '';

    try {
      let dateObj;
      if (value instanceof Date) {
        dateObj = value;
      } else if (value && typeof value.toDate === 'function') {
        dateObj = value.toDate();
      } else if (value && value.seconds) {
        dateObj = new Date(value.seconds * 1000);
      } else if (typeof value === 'string') {
        // Try to parse ISO or existing dd/mm/yyyy
        if (value.includes('/')) return value;
        dateObj = new Date(value);
      } else {
        return '';
      }

      if (isNaN(dateObj.getTime())) return '';

      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = String(dateObj.getFullYear());
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const normalizeDateValue = (value) => {
    if (!value) return '';
    if (value && typeof value.toDate === 'function') {
      return value.toDate().toISOString().split('T')[0];
    }
    if (value && value.seconds) {
      return new Date(value.seconds * 1000).toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      return value.includes('/') ? convertDateToISO(value) : value;
    }
    return '';
  };

  const getMissingDocuments = (checklist) => {
    return requiredDocuments
      .filter(({ key }) => !checklist?.[key])
      .map(({ label }) => label);
  };

  // Load existing research data when in edit mode
  useEffect(() => {
    const loadExistingResearch = async () => {
      if (!editId || !db) return;

      setLoadingExisting(true);
      try {
        const docRef = doc(db, 'researchProposals', editId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          console.warn('Research to edit not found:', editId);
          setLoadingExisting(false);
          return;
        }

        const data = snap.data();
        setExistingResearcherId(data.researcherId || '');
        previousResearchRef.current = data;

        const normalizedFiles = toPersistedRequiredDocumentsMap(data.requiredDocumentsFiles);
        const normalizedChecklist = {
          ...normalizeRequiredDocumentsChecklist(data.requiredDocumentsChecklist),
          ...buildRequiredDocumentsChecklist(normalizedFiles),
        };

        if (formDirtyRef.current) {
          updateFormData((prev) => ({
            ...prev,
            requiredDocumentsFiles: {
              ...normalizedFiles,
              ...prev.requiredDocumentsFiles,
            },
            requiredDocumentsChecklist: {
              ...normalizedChecklist,
              ...prev.requiredDocumentsChecklist,
            },
          }));
          return;
        }

        const loadedWorkPlanTasks = normalizeWorkPlanTasks(
          data.workPlanTasks ||
          data.workPlan ||
          data.ganttTasks ||
          data.tasks ||
          []
        );

        updateFormData(prev => ({
          ...prev,
          projectTitle: data.projectTitle || data.title || '',
          fundName: data.fundName || '',
          fundType: data.fundType || '',
          submissionPath: data.submissionPath || '',
          researcherRole: data.researcherRole || '',
          proposalStage: data.proposalStage || '',
          submissionType: data.submissionType || '',
          researchStartDate: timestampToDisplayDate(data.researchStartDate),
          researchEndDate: timestampToDisplayDate(data.researchEndDate),
          researchDurationYears: data.researchDurationYears || '',
          academicYear: normalizeAcademicYear(data.academicYear, data.researchStartDate),
          totalBudget: data.totalBudget || '',
          currency: data.currency || 'ILS',
          convertedBudget: data.convertedBudget || '',
          budgetComponents: data.budgetComponents || {},
          partners: (data.partners && data.partners.length > 0)
            ? data.partners
            : [{ name: '', email: '', institution: '', country: '' }],
          requiredDocumentsChecklist: normalizedChecklist,
          requiredDocumentsFiles: normalizedFiles,
          digitalSignature: data.digitalSignature || { signed: false, date: '', signer: '' },
          expectedResponseDate: timestampToDisplayDate(data.expectedResponseDate),
          notes: data.notes || '',
          abstract: data.abstract || '',
          scientificBackground: data.scientificBackground || '',
          researchObjectives: data.researchObjectives || '',
          detailedDescription: data.detailedDescription || '',
          significanceInnovation: data.significanceInnovation || '',
          applicability: data.applicability || '',
          principalInvestigatorName: data.principalInvestigatorName || '',
          biographicalSummaryName: data.biographicalSummaryName || '',
          biographicalSummaryPositionTitle: data.biographicalSummaryPositionTitle || '',
          bibliographyEducationTraining:
            (Array.isArray(data.bibliographyEducationTraining) && data.bibliographyEducationTraining.length > 0)
              ? data.bibliographyEducationTraining
              : [{ institutionLocation: '', degree: '', monthYear: '', fieldOfStudy: '' }],
          bibliographyPersonalStatement: data.bibliographyPersonalStatement || '',
          bibliographyPositionsAndHonors: data.bibliographyPositionsAndHonors || '',
          bibliographySelectedPublications: data.bibliographySelectedPublications || '',
          bibliographyResearchSupport: data.bibliographyResearchSupport || '',
          workPlanTasks: loadedWorkPlanTasks,
        }));

        setHasPartners(Boolean(data.partners && data.partners.length > 0));
        setWorkPlanKey((key) => key + 1);
      } catch (err) {
        console.error('Error loading research for edit:', err);
      } finally {
        setLoadingExisting(false);
      }
    };

    loadExistingResearch();
  }, [editId]);

  // Calculate converted budget
  useEffect(() => {
    if (formData.totalBudget && formData.currency) {
      // Simplified conversion rates (should be fetched from API in production)
      const rates = {
        'ILS': 1,
        'USD': 3.7,
        'EUR': 4.0
      };
      
      const rate = rates[formData.currency] || 1;
      const converted = (parseFloat(formData.totalBudget) * rate).toFixed(0);
      
      updateFormData(prev => ({
        ...prev,
        convertedBudget: converted
      }));
    } else {
      updateFormData(prev => ({
        ...prev,
        convertedBudget: ''
      }));
    }
  }, [formData.totalBudget, formData.currency]);

  // Format date from YYYY-MM-DD to dd/mm/yyyy
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    // If already in dd/mm/yyyy format, return as is
    if (dateString.includes('/')) {
      return dateString;
    }
    // Convert from YYYY-MM-DD to dd/mm/yyyy
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  // Convert date from dd/mm/yyyy to YYYY-MM-DD for storage
  const convertDateToISO = (dateString) => {
    if (!dateString) return '';
    // If already in YYYY-MM-DD format, return as is
    if (dateString.includes('-') && dateString.length === 10) {
      return dateString;
    }
    // Convert from dd/mm/yyyy to YYYY-MM-DD
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return dateString;
  };

  // Handle date input with formatting
  const handleDateChange = (name, value) => {
    // Remove non-numeric characters except /
    let cleaned = value.replace(/[^\d/]/g, '');
    
    // Split by / to handle each part separately
    const parts = cleaned.split('/');
    let day = parts[0] || '';
    let month = parts[1] || '';
    let year = parts[2] || '';
    
    // Limit day to 2 digits and validate (01-31)
    if (day.length > 2) {
      day = day.slice(0, 2);
    }
    if (day.length === 2) {
      const dayNum = parseInt(day, 10);
      if (dayNum > 31) {
        day = '31';
      } else if (dayNum < 1) {
        day = '01';
      }
    }
    
    // Limit month to 2 digits and validate (01-12)
    if (month.length > 2) {
      month = month.slice(0, 2);
    }
    if (month.length === 2) {
      const monthNum = parseInt(month, 10);
      if (monthNum > 12) {
        month = '12';
      } else if (monthNum < 1) {
        month = '01';
      }
    }
    
    // Limit year to 4 digits
    if (year.length > 4) {
      year = year.slice(0, 4);
    }
    
    // Reconstruct the date string
    let formatted = day;
    if (month || (cleaned.includes('/') && day.length === 2)) {
      formatted += '/' + month;
    }
    if (year || (cleaned.split('/').length > 2 && month.length === 2)) {
      formatted += '/' + year;
    }
    
    // Auto-add / after day when 2 digits are entered
    if (day.length === 2 && !month && !cleaned.includes('/') && value.length > cleaned.length) {
      formatted = day + '/';
    }
    
    // Auto-add / after month when 2 digits are entered
    if (month.length === 2 && !year && cleaned.split('/').length === 2 && value.length > cleaned.length) {
      formatted = day + '/' + month + '/';
    }

    updateFormData(prev => ({
      ...prev,
      [name]: formatted
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle date picker change (from calendar)
  const handleDatePickerChange = (name, value) => {
    markFormDirty();
    if (value) {
      // Convert from YYYY-MM-DD to dd/mm/yyyy
      const parts = value.split('-');
      if (parts.length === 3) {
        const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        updateFormData(prev => ({
          ...prev,
          [name]: formatted
        }));
      }
    } else {
      updateFormData(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear error
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleChange = (e) => {
    markFormDirty();
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      updateFormData(prev => ({
        ...prev,
        [name]: files[0] || null
      }));
    } else if (name === 'researchStartDate' || name === 'researchEndDate' || name === 'expectedResponseDate') {
      // Handle date fields with custom formatting
      handleDateChange(name, value);
    } else {
      updateFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBudgetComponentChange = (component, value) => {
    markFormDirty();
    // Ensure value is a string (for number input)
    const budgetValue = typeof value === 'string' ? value : '';
    
    updateFormData(prev => {
      const newBudgetComponents = {
        ...prev.budgetComponents,
        [component]: budgetValue
      };
      
      // Calculate total budget from all components
      const total = Object.values(newBudgetComponents).reduce((sum, amount) => {
        const numAmount = parseFloat(amount) || 0;
        return sum + numAmount;
      }, 0);
      
      return {
        ...prev,
        budgetComponents: newBudgetComponents,
        totalBudget: total > 0 ? total.toString() : ''
      };
    });
  };

  const persistRequiredDocuments = async (proposalId, requiredDocumentsFiles, checklist) => {
    const persistedFiles = toPersistedRequiredDocumentsMap(requiredDocumentsFiles);
    const finalChecklist = checklist || buildRequiredDocumentsChecklist(persistedFiles);

    await updateDoc(doc(db, 'researchProposals', proposalId), {
      requiredDocumentsFiles: persistedFiles,
      requiredDocumentsChecklist: finalChecklist,
      updatedAt: serverTimestamp(),
    });

    updateFormData((prev) => ({
      ...prev,
      requiredDocumentsFiles: persistedFiles,
      requiredDocumentsChecklist: finalChecklist,
    }));

    previousResearchRef.current = {
      ...(previousResearchRef.current || {}),
      requiredDocumentsFiles: persistedFiles,
      requiredDocumentsChecklist: finalChecklist,
    };
    formDirtyRef.current = false;
  };

  const handleRequiredDocumentUpload = async (documentKey, selectedFiles) => {
    const files = Array.from(selectedFiles || []);
    if (files.length === 0) return;

    if (editId) {
      setDocumentsUploading(true);
      try {
        const currentMap = toPersistedRequiredDocumentsMap(formDataRef.current.requiredDocumentsFiles);
        const existingForDoc = currentMap[documentKey] || [];
        const uploadedNew = [];

        for (const file of files) {
          if (!(file instanceof File)) continue;
          const meta = await uploadRequiredDocumentFile({
            storage,
            proposalId: editId,
            docKey: documentKey,
            file,
          });
          if (meta) uploadedNew.push(meta);
        }

        const nextFiles = {
          ...currentMap,
          [documentKey]: [...existingForDoc, ...uploadedNew],
        };
        await persistRequiredDocuments(
          editId,
          nextFiles,
          buildRequiredDocumentsChecklist(nextFiles)
        );
      } catch (uploadError) {
        console.error('Error uploading required document:', uploadError);
        alert(
          t('documentUploadError', 'העלאת הקובץ נכשלה. נסו שוב.')
          + (uploadError?.message ? ` (${uploadError.message})` : '')
        );
      } finally {
        setDocumentsUploading(false);
      }
      return;
    }

    markFormDirty();
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
        const currentMap = toPersistedRequiredDocumentsMap(formDataRef.current.requiredDocumentsFiles);
        const nextForDoc = [...(currentMap[documentKey] || [])];
        nextForDoc.splice(fileIndex, 1);
        const nextFiles = { ...currentMap, [documentKey]: nextForDoc };
        await persistRequiredDocuments(
          editId,
          nextFiles,
          buildRequiredDocumentsChecklist(nextFiles)
        );
      } catch (removeError) {
        console.error('Error removing required document:', removeError);
        alert(t('documentRemoveError', 'שגיאה בהסרת הקובץ'));
      } finally {
        setDocumentsUploading(false);
      }
      return;
    }

    markFormDirty();
    updateFormData((prev) => {
      const currentFiles = [...(prev.requiredDocumentsFiles?.[documentKey] || [])];
      currentFiles.splice(fileIndex, 1);
      const nextRequiredDocumentsFiles = {
        ...(prev.requiredDocumentsFiles || {}),
        [documentKey]: currentFiles,
      };
      return {
        ...prev,
        requiredDocumentsFiles: nextRequiredDocumentsFiles,
        requiredDocumentsChecklist: {
          ...prev.requiredDocumentsChecklist,
          [documentKey]: currentFiles.length > 0,
        },
      };
    });
  };

  const handlePartnerChange = (index, field, value) => {
    markFormDirty();
    const updatedPartners = [...formData.partners];
    updatedPartners[index][field] = value;
    updateFormData(prev => ({
      ...prev,
      partners: updatedPartners
    }));
  };

  const addPartner = () => {
    markFormDirty();
    updateFormData(prev => ({
      ...prev,
      partners: [...prev.partners, { name: '', email: '', institution: '', country: '' }]
    }));
  };

  const removePartner = (index) => {
    markFormDirty();
    updateFormData(prev => ({
      ...prev,
      partners: prev.partners.filter((_, i) => i !== index)
    }));
  };

  const handleBibliographyEducationChange = (index, field, value) => {
    markFormDirty();
    updateFormData((prev) => {
      const nextRows = [...(prev.bibliographyEducationTraining || [])];
      if (!nextRows[index]) {
        nextRows[index] = { institutionLocation: '', degree: '', monthYear: '', fieldOfStudy: '' };
      }
      nextRows[index] = {
        ...nextRows[index],
        [field]: value,
      };
      return {
        ...prev,
        bibliographyEducationTraining: nextRows,
      };
    });
  };

  const addBibliographyEducationRow = () => {
    markFormDirty();
    updateFormData((prev) => ({
      ...prev,
      bibliographyEducationTraining: [
        ...(prev.bibliographyEducationTraining || []),
        { institutionLocation: '', degree: '', monthYear: '', fieldOfStudy: '' },
      ],
    }));
  };

  const removeBibliographyEducationRow = (index) => {
    markFormDirty();
    updateFormData((prev) => {
      const rows = [...(prev.bibliographyEducationTraining || [])];
      const next = rows.filter((_, i) => i !== index);
      return {
        ...prev,
        bibliographyEducationTraining: next.length > 0 ? next : [{ institutionLocation: '', degree: '', monthYear: '', fieldOfStudy: '' }],
      };
    });
  };

  const handleDigitalSignature = () => {
    markFormDirty();
    updateFormData(prev => ({
      ...prev,
      digitalSignature: {
        signed: true,
        date: new Date().toISOString().split('T')[0],
        signer: user?.name || 'חתימה דיגיטלית'
      }
    }));
  };

  const validateForm = (snapshot = formDataRef.current) => {
    const newErrors = {};
    
    if (!snapshot.projectTitle.trim()) {
      newErrors.projectTitle = 'כותרת הפרוייקט חובה';
    }
    if (!snapshot.fundName) {
      newErrors.fundName = 'שם הקרן חובה';
    }
    if (!snapshot.submissionPath) {
      newErrors.submissionPath = 'מסלול ההגשה חובה';
    }
    if (!snapshot.researcherRole) {
      newErrors.researcherRole = 'תפקיד החוקר חובה';
    }
    if (!snapshot.proposalStage) {
      newErrors.proposalStage = 'שלב ההצעה חובה';
    }
    // Validate date format dd/mm/yyyy
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    
    if (!snapshot.researchStartDate) {
      newErrors.researchStartDate = 'תאריך תחילת המחקר חובה';
    } else if (!datePattern.test(snapshot.researchStartDate)) {
      newErrors.researchStartDate = 'תאריך לא תקין. נא להזין בפורמט dd/mm/yyyy';
    } else {
      const startDateISO = convertDateToISO(snapshot.researchStartDate);
      const startDate = new Date(startDateISO);
      if (isNaN(startDate.getTime())) {
        newErrors.researchStartDate = 'תאריך לא תקין';
      }
    }
    
    if (!snapshot.researchEndDate) {
      newErrors.researchEndDate = 'תאריך סיום המחקר חובה';
    } else if (!datePattern.test(snapshot.researchEndDate)) {
      newErrors.researchEndDate = 'תאריך לא תקין. נא להזין בפורמט dd/mm/yyyy';
    } else {
      const endDateISO = convertDateToISO(snapshot.researchEndDate);
      const endDate = new Date(endDateISO);
      if (isNaN(endDate.getTime())) {
        newErrors.researchEndDate = 'תאריך לא תקין';
      } else if (snapshot.researchStartDate) {
        const startDateISO = convertDateToISO(snapshot.researchStartDate);
        const startDate = new Date(startDateISO);
        if (!isNaN(startDate.getTime()) && endDate <= startDate) {
          newErrors.researchEndDate = 'תאריך סיום חייב להיות אחרי תאריך התחלה';
        }
      }
    }
    // Check if at least one budget component has a value
    const hasBudgetComponents = Object.values(snapshot.budgetComponents || {}).some(amount => {
      const numAmount = parseFloat(amount) || 0;
      return numAmount > 0;
    });
    
    if (!hasBudgetComponents) {
      newErrors.budgetComponents = 'יש למלא לפחות קטגוריית תקציב אחת';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDraftForm = (snapshot = formDataRef.current) => {
    if (!snapshot.projectTitle.trim()) {
      setErrors({ projectTitle: t('draftTitleRequired', 'יש להזין לפחות כותרת לשמירת טיוטה') });
      return false;
    }
    setErrors({});
    return true;
  };

  const saveResearch = async (asDraft = false) => {
    if (loadingExisting) {
      alert('הנתונים הקיימים עדיין בטעינה. נסו שוב בעוד רגע.');
      return;
    }

    const fd = formDataRef.current;

    if (asDraft) {
      if (!validateDraftForm(fd)) {
        alert(t('draftTitleRequired', 'יש להזין לפחות כותרת לשמירת טיוטה'));
        return;
      }
    } else if (!validateForm(fd)) {
      alert('יש למלא את כל השדות החובה');
      return;
    }

    try {
      const isEdit = Boolean(editId);
      const wasDraft = getSubmissionStatus(previousResearchRef.current) === 'draft';
      const researcherId = user?.id || 'temp-user-id';
      const researcherName = user?.name || 'חוקר';

      console.log('Starting to save research proposal...');
      console.log('Researcher ID:', researcherId);
      console.log('Researcher Name:', researcherName);

      // Convert dates to Timestamp for Firestore
      const researchStartDateISO = convertDateToISO(fd.researchStartDate);
      const researchEndDateISO = convertDateToISO(fd.researchEndDate);
      const expectedResponseDateISO = convertDateToISO(fd.expectedResponseDate);
      
      const researchStartDate = researchStartDateISO 
        ? Timestamp.fromDate(new Date(researchStartDateISO))
        : null;
      
      const researchEndDate = researchEndDateISO 
        ? Timestamp.fromDate(new Date(researchEndDateISO))
        : null;
      
      const expectedResponseDate = expectedResponseDateISO 
        ? Timestamp.fromDate(new Date(expectedResponseDateISO))
        : null;

      // Prepare research data
      const existingStatus = previousResearchRef.current?.status;
      const existingHasPatent = previousResearchRef.current?.hasPatent;
      const existingCreatedAt = previousResearchRef.current?.createdAt;
      const existingSubmissionDate = previousResearchRef.current?.submissionDate;
      const existingIsNew = previousResearchRef.current?.isNew;
      const existingSubmittedAt = previousResearchRef.current?.submittedAt;
      const existingSubmissionStatus = previousResearchRef.current?.submissionStatus;
      const existingApprovedBudget = previousResearchRef.current?.approvedBudget;
      const existingResearcherName = previousResearchRef.current?.researcherName || '';
      const finalResearcherId = isEdit && userRole === 'ADMIN' && existingResearcherId
        ? existingResearcherId
        : researcherId;
      const finalResearcherName = isEdit && userRole === 'ADMIN' && existingResearcherName
        ? existingResearcherName
        : researcherName;
      const normalizedFormWorkPlanTasks = normalizeWorkPlanTasks(fd.workPlanTasks || []);
      const normalizedExistingWorkPlanTasks = normalizeWorkPlanTasks(
        previousResearchRef.current?.workPlanTasks ||
        previousResearchRef.current?.workPlan ||
        previousResearchRef.current?.ganttTasks ||
        previousResearchRef.current?.tasks ||
        []
      );
      // Guard against accidental reset in edit mode:
      // if form tasks are empty but existing DB tasks are present, keep existing tasks.
      const finalWorkPlanTasks = (
        isEdit &&
        normalizedFormWorkPlanTasks.length === 0 &&
        normalizedExistingWorkPlanTasks.length > 0
      )
        ? normalizedExistingWorkPlanTasks
        : normalizedFormWorkPlanTasks;
      const previousRequiredFiles = toPersistedRequiredDocumentsMap(
        previousResearchRef.current?.requiredDocumentsFiles
      );
      const persistedFromForm = toPersistedRequiredDocumentsMap(fd.requiredDocumentsFiles);
      const hasPendingLocalFiles = Object.values(
        normalizeRequiredDocumentsFiles(fd.requiredDocumentsFiles)
      ).some((entries) => entries.some((item) => item instanceof File));

      let docId = editId;
      if (!docId) {
        docId = doc(collection(db, 'researchProposals')).id;
      }

      let requiredDocumentsFilesUrls;
      try {
        if (isEdit && !hasPendingLocalFiles) {
          requiredDocumentsFilesUrls = {
            ...previousRequiredFiles,
            ...persistedFromForm,
          };
        } else {
          requiredDocumentsFilesUrls = await buildRequiredDocumentsFilesUrls({
            formFiles: normalizeRequiredDocumentsFiles(fd.requiredDocumentsFiles),
            previousFiles: previousRequiredFiles,
            docKeys: REQUIRED_DOCUMENT_KEYS,
            proposalId: docId,
            storage,
          });
          requiredDocumentsFilesUrls = {
            ...previousRequiredFiles,
            ...toPersistedRequiredDocumentsMap(requiredDocumentsFilesUrls),
          };
        }
      } catch (requiredDocsError) {
        console.error('Error uploading required document files:', requiredDocsError);
        throw new Error('שגיאה בהעלאת קבצי המסמכים. נסו שוב.');
      }

      const requiredDocumentsChecklistFromFiles = buildRequiredDocumentsChecklist(
        requiredDocumentsFilesUrls
      );

      const researchData = {
        // פרטים כלליים
        projectTitle: fd.projectTitle,
        fundName: fd.fundName,
        fundType: fd.fundType || '',
        submissionPath: fd.submissionPath,
        researcherRole: fd.researcherRole,
        proposalStage: fd.proposalStage,
        submissionType: fd.submissionType || '',
        
        // פרטי החוקר
        researcherId: finalResearcherId,
        researcherName: finalResearcherName,
        
        // תקופת המחקר
        researchStartDate: researchStartDate,
        researchEndDate: researchEndDate,
        researchDurationYears: fd.researchDurationYears || '',
        academicYear: fd.academicYear || '',
        
        // תקציב
        totalBudget: fd.totalBudget || '',
        currency: fd.currency || 'ILS',
        convertedBudget: fd.convertedBudget || '',
        budgetComponents: fd.budgetComponents || {},
        
        // שותפים - רק אם יש שותפים
        partners: hasPartners ? fd.partners.filter(p => p.name || p.email || p.institution || p.country) || [] : [],
        
        // מסמכים
        requiredDocumentsChecklist: requiredDocumentsChecklistFromFiles,
        requiredDocumentsFiles: requiredDocumentsFilesUrls,
        
        // חתימה
        digitalSignature: fd.digitalSignature || { signed: false, signer: '', date: null },
        
        // מידע נוסף
        expectedResponseDate: expectedResponseDate,
        notes: fd.notes || '',
        
        // תיאור המחקר
        abstract: fd.abstract || '',
        scientificBackground: fd.scientificBackground || '',
        researchObjectives: fd.researchObjectives || '',
        detailedDescription: fd.detailedDescription || '',
        significanceInnovation: fd.significanceInnovation || '',
        applicability: fd.applicability || '',
        principalInvestigatorName: fd.principalInvestigatorName || '',
        biographicalSummaryName: fd.biographicalSummaryName || '',
        biographicalSummaryPositionTitle: fd.biographicalSummaryPositionTitle || '',
        bibliographyEducationTraining: normalizeBibliographyRowsForSave(fd.bibliographyEducationTraining),
        bibliographyPersonalStatement: String(fd.bibliographyPersonalStatement ?? ''),
        bibliographyPositionsAndHonors: String(fd.bibliographyPositionsAndHonors ?? ''),
        bibliographySelectedPublications: String(fd.bibliographySelectedPublications ?? ''),
        bibliographyResearchSupport: String(fd.bibliographyResearchSupport ?? ''),
        
        // תוכנית עבודה
        workPlanTasks: finalWorkPlanTasks,
        
        // סטטוס
        status: isEdit ? (existingStatus || 'pending') : 'pending',
        submissionStatus: userRole === 'ADMIN' && isEdit
          ? (existingSubmissionStatus || 'submitted')
          : (asDraft ? 'draft' : 'submitted'),
        submittedAt: asDraft
          ? (existingSubmittedAt || null)
          : serverTimestamp(),
        draftUpdatedAt: asDraft ? serverTimestamp() : (previousResearchRef.current?.draftUpdatedAt || null),
        hasPatent: isEdit ? Boolean(existingHasPatent) : false,
        approvedBudget: isEdit ? (existingApprovedBudget ?? null) : null,
        
        // תאריכים
        submissionDate: isEdit
          ? (existingSubmissionDate || researchStartDate || serverTimestamp())
          : (researchStartDate || serverTimestamp()),
        createdAt: isEdit ? (existingCreatedAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp(),
        isNew: asDraft ? false : ((!isEdit || wasDraft) ? true : Boolean(existingIsNew))
      };

      console.log('Research data prepared:', researchData);

      console.log(isEdit ? 'Updating research proposal...' : 'Creating research proposal...');
      if (isEdit) {
        await updateDoc(doc(db, 'researchProposals', docId), researchData);
      } else {
        await setDoc(doc(db, 'researchProposals', docId), researchData);
        console.log('Document created with ID:', docId);
      }

      updateFormData((prev) => ({
        ...prev,
        requiredDocumentsFiles: toPersistedRequiredDocumentsMap(requiredDocumentsFilesUrls),
        requiredDocumentsChecklist: requiredDocumentsChecklistFromFiles,
      }));

      // ── Notify admin when RESEARCHER submits (not draft) ────────────────
      if (userRole === 'RESEARCHER' && !asDraft) {
        const notifyAsNew = !isEdit || wasDraft;
        await createNotification({
          userId: 'ADMIN',
          targetRole: 'ADMIN',
          title: notifyAsNew ? 'חוקר הגיש הצעת מחקר חדשה' : 'חוקר עדכן הצעת מחקר',
          message: notifyAsNew
            ? `${user?.name || 'חוקר'} הגיש/ה הצעת מחקר חדשה: "${fd.projectTitle}".`
            : `${user?.name || 'חוקר'} עדכן/ה את הצעת המחקר "${fd.projectTitle}".`,
          type: notifyAsNew ? 'researcher_new_proposal' : 'researcher_edit_proposal',
          entityType: 'research',
          entityId: docId,
          link: `/research/${docId}`,
          eventKey: `${notifyAsNew ? 'researcher_new_proposal' : 'researcher_edit_proposal'}:${docId}:${Date.now()}`
        });
      }

      if (isEdit && userRole === 'ADMIN' && existingResearcherId) {
        const previous = previousResearchRef.current || {};
        const notifications = [];

        notifications.push({
          title: 'עדכון הצעת מחקר',
          message: `הצעת המחקר "${fd.projectTitle}" עודכנה על ידי רשות המחקר.`,
          type: 'research_update',
          eventKey: `research_updated:${editId}:${Date.now()}`
        });

        const prevStatus = previous.status || '';
        const nextStatus = researchData.status || '';
        if (prevStatus && nextStatus && prevStatus !== nextStatus) {
          notifications.push({
            title: 'סטטוס הצעה עודכן',
            message: `סטטוס הצעת המחקר השתנה מ-"${prevStatus}" ל-"${nextStatus}".`,
            type: 'status_update',
            eventKey: `research_status:${editId}:${Date.now()}`
          });
        }

        const prevBudget = previous.totalBudget || '';
        const nextBudget = researchData.totalBudget || '';
        if (prevBudget && nextBudget && prevBudget !== nextBudget) {
          notifications.push({
            title: 'עדכון תקציב',
            message: `עודכן התקציב בהצעת המחקר: ${prevBudget} → ${nextBudget}.`,
            type: 'budget_update',
            eventKey: `research_budget:${editId}:${Date.now()}`
          });
        }

        const prevExpected = normalizeDateValue(previous.expectedResponseDate);
        const nextExpected = normalizeDateValue(researchData.expectedResponseDate);
        if (prevExpected && nextExpected && prevExpected !== nextExpected) {
          notifications.push({
            title: 'עדכון תאריך משוער',
            message: `התאריך המשוער לתשובה עודכן ל-${new Date(nextExpected).toLocaleDateString('he-IL')}.`,
            type: 'date_update',
            eventKey: `research_expected:${editId}:${Date.now()}`
          });
        }

        const prevMissing = getMissingDocuments(previous.requiredDocumentsChecklist || {});
        const nextMissing = getMissingDocuments(researchData.requiredDocumentsChecklist || {});
        const prevMissingSet = new Set(prevMissing);
        const newlyMissing = nextMissing.filter((docName) => !prevMissingSet.has(docName));
        if (nextMissing.length > 0 && newlyMissing.length > 0) {
          notifications.push({
            title: 'מסמכים חסרים להגשה',
            message: `נדרשים מסמכים נוספים: ${newlyMissing.join(', ')}.`,
            type: 'missing_docs',
            eventKey: `research_missing_docs:${editId}:${Date.now()}`
          });
        }

        await Promise.all(
          notifications.map((n) =>
            createNotification({
              userId: existingResearcherId,
              title: n.title,
              message: n.message,
              type: n.type,
              entityType: 'research',
              entityId: editId,
              link: `/research/${editId}`,
              eventKey: n.eventKey
            })
          )
        );
      }

      previousResearchRef.current = {
        ...(previousResearchRef.current || {}),
        ...researchData,
        requiredDocumentsFiles: requiredDocumentsFilesUrls,
      };
      formDirtyRef.current = false;

      console.log('Research proposal saved successfully!');
      if (asDraft) {
        alert(t('draftSavedSuccess', 'הטיוטה נשמרה בהצלחה'));
        if (!isEdit) {
          navigate(`/research/new?edit=${docId}`, { replace: true });
        }
        return;
      }
      alert('הצעת המחקר נשלחה בהצלחה!');
      navigate(userRole === 'RESEARCHER' ? '/' : '/research');
    } catch (error) {
      console.error('Error saving research:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'שגיאה בשמירת המחקר. ';
      
      if (error.code === 'permission-denied') {
        errorMessage += 'אין הרשאה לשמור. בדקי את ה-Security Rules ב-Firebase.';
      } else if (error.code === 'unavailable') {
        errorMessage += 'Firebase לא זמין כרגע. נסי שוב מאוחר יותר.';
      } else {
        errorMessage += `פרטים: ${error.message || 'שגיאה לא ידועה'}`;
      }
      
      alert(errorMessage);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveResearch(false);
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    await saveResearch(true);
  };

  const handleDeleteResearch = async () => {
    if (!editId || !db || deleting) return;

    const existing = previousResearchRef.current;
    if (!canDeleteResearch(existing)) {
      alert(t('deleteResearchNotAllowed', 'ניתן למחוק רק הצעה בטיוטה או בסטטוס המתנה'));
      return;
    }

    if (userRole === 'RESEARCHER' && existing?.researcherId !== user?.id) {
      alert(t('noPermissionAction', 'אין הרשאה לבצע פעולה זו'));
      return;
    }

    if (!window.confirm(t('confirmDeleteResearch', 'האם את/ה בטוח/ה שברצונך למחוק את הצעת המחקר? פעולה זו אינה ניתנת לביטול.'))) {
      return;
    }

    setDeleting(true);
    try {
      const tasksSnap = await getDocs(collection(db, 'researchProposals', editId, 'tasks'));
      const batch = writeBatch(db);
      tasksSnap.docs.forEach((taskDoc) => batch.delete(taskDoc.ref));
      batch.delete(doc(db, 'researchProposals', editId));
      await batch.commit();

      alert(t('deleteResearchSuccess', 'הצעת המחקר נמחקה בהצלחה'));
      navigate(userRole === 'RESEARCHER' ? '/' : '/research');
    } catch (error) {
      console.error('Error deleting research proposal:', error);
      alert(t('deleteResearchError', 'שגיאה במחיקת הצעת המחקר'));
    } finally {
      setDeleting(false);
    }
  };

  const isCurrentDraft = !editId || getSubmissionStatus(previousResearchRef.current) === 'draft';
  const showDraftButton = userRole === 'RESEARCHER' && isCurrentDraft;
  const showDeleteButton =
    Boolean(editId) &&
    canDeleteResearch(previousResearchRef.current) &&
    (userRole === 'ADMIN' || previousResearchRef.current?.researcherId === user?.id);

  const getCancelTarget = () =>
    editId ? `/research/${editId}` : (userRole === 'RESEARCHER' ? '/' : '/research');

  const handleCancel = () => {
    if (editId && !window.confirm(t('confirmCancelEdit', 'השינויים שביצעת לא יישמרו. האם לבטל את העריכה?'))) {
      return;
    }
    navigateBackOrFallback(navigate, getCancelTarget());
  };

  const handleExportPDF = () => {
    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL');
    };

    // Build partners HTML
    const partnersHTML = formData.partners
      .filter((p) => p.name || p.email || p.institution || p.country)
      .map(
        (partner, index) => `
        <div class="partner-block">
          <div class="partner-block-title">שותף ${index + 1}</div>
          ${buildFormFieldBlock('שם השותף', partner.name || '')}
          ${buildFormFieldBlock('אימייל', partner.email || '')}
          ${buildFormFieldBlock('מוסד', partner.institution || '')}
          ${buildFormFieldBlock('מדינה', partner.country || '')}
        </div>
      `
      )
      .join('');

    // Build budget components HTML
    const budgetComponentsHTML = Object.entries(formData.budgetComponents)
      .filter(([_, value]) => value)
      .map(([component, amount]) => `
        <tr>
          <td>${component}</td>
          <td>${amount ? `${amount} ${formData.currency === 'ILS' ? '₪' : formData.currency === 'USD' ? '$' : '€'}` : '-'}</td>
        </tr>
      `).join('');

    // Build documents checklist HTML
    const docLabelByKey = Object.fromEntries(
      requiredDocuments.map(({ key, label }) => [key, label])
    );
    const documentsHTML = Object.entries(formData.requiredDocumentsChecklist)
      .filter(([_, checked]) => checked)
      .map(([docKey]) => `<li>${docLabelByKey[docKey] || docKey}</li>`)
      .join('');

    const budgetTotalDisplay = formData.totalBudget
      ? `${formData.totalBudget} ${formData.currency === 'ILS' ? '₪' : formData.currency === 'USD' ? '$' : '€'}`
      : '';
    const convertedDisplay = formData.convertedBudget ? `${formData.convertedBudget} ₪` : '';

    const isEn = language === 'en';
    const ns = (he, en) => isEn ? en : he;

    const htmlBody = `
      ${buildResearchProposalHeader({
        titleHe: isEn ? '' : 'תכנית מחקר - הצעה מלאה',
        titleEn: isEn ? 'Research Program – Full Proposal' : 'RESEARCH PROPOSAL',
        metaLines: [
          { label: ns('כותרת', 'Title'), value: formData.projectTitle || '' },
          { label: ns('רכז הפרויקט', 'Project coordinator'), value: user?.displayName || user?.email || '' },
        ],
      })}

      ${buildMetaSection(t('generalDetails', 'פרטים כלליים'), [
        [t('projectTitleLabel', 'כותרת הפרוייקט שהוגש לקרן חיצונית'), formData.projectTitle],
        [t('fundNameLabel', 'שם הקרן אליה הוגשה הבקשה'), formData.fundName],
        [t('fundTypeLabel', 'סוג הקרן'), formData.fundType],
        [t('submissionPathLabel', 'מסלול ההגשה לקרן'), formData.submissionPath],
        [t('researcherRoleLabel', 'תפקיד החוקר בהצעת המחקר'), formData.researcherRole],
        [t('proposalStageLabel', 'שלב ההצעה'), formData.proposalStage],
        [t('submissionTypeLabel', 'סוג הגשה'), formData.submissionType],
      ].map(([label, value]) => [label, value || t('notSpecified', 'לא צוין')]))}

      ${buildMetaSection(t('researchPeriod', 'תקופת המחקר'), [
        [t('startDateLabel', 'תאריך תחילת המחקר'), formatDate(formData.researchStartDate) || t('notSpecified', 'לא צוין')],
        [t('endDateLabel', 'תאריך סיום המחקר'), formatDate(formData.researchEndDate) || t('notSpecified', 'לא צוין')],
        [t('totalResearchYears', 'סה"כ תקופת המחקר בשנים'), formData.researchDurationYears || t('notSpecified', 'לא צוין')],
        [t('academicYearLabel', 'שנה אקדמית'), formData.academicYear || t('notSpecified', 'לא צוין')],
      ])}

      <div class="section">
        ${buildSectionHeading(t('budgetTitle', 'תקציב'))}
        ${buildMetaTable([
          [t('totalBudgetRequested', 'סה"כ התקציב המבוקש'), budgetTotalDisplay || t('notSpecified', 'לא צוין')],
          [t('budgetConvertedIls', 'התקציב המתורגם לשקלים'), convertedDisplay || t('notSpecified', 'לא צוין')],
        ])}
        ${
          budgetComponentsHTML
            ? `
          <table>
            <thead>
              <tr>
                <th>${ns('רכיב תקציב', 'Budget component')}</th>
                <th>${ns('סכום', 'Amount')}</th>
              </tr>
            </thead>
            <tbody>${budgetComponentsHTML}</tbody>
          </table>`
            : ''
        }
      </div>

      ${
        partnersHTML
          ? `
        <div class="section">
          ${buildSectionHeading(t('partnersProjectTitle', 'שותפים לפרוייקט'))}
          ${partnersHTML}
        </div>`
          : ''
      }

      ${
        documentsHTML
          ? `
        <div class="section">
          ${buildSectionHeading(ns('מסמכים', 'Documents'))}
          <div class="form-field-block">
            <div class="form-field-label">${ns('מסמכים שהוגשו', 'Submitted documents')}</div>
            <div class="form-field-value"><ul style="margin:0;padding-inline-start:20pt">${documentsHTML}</ul></div>
          </div>
        </div>`
          : ''
      }

      ${
        formData.digitalSignature.signed
          ? buildMetaSection(t('digitalSignatureTitle', 'חתימה דיגיטלית'), [
              [t('signedBy', 'חתום על ידי'), formData.digitalSignature.signer],
              [t('signatureDate', 'תאריך חתימה'), formatDate(formData.digitalSignature.date)],
            ])
          : ''
      }

      ${formData.expectedResponseDate ? buildFormFieldBlock(t('expectedResponseDateLabel', 'תאריך משוער'), formatDate(formData.expectedResponseDate)) : ''}
      ${formData.notes ? buildFormFieldBlock(t('notesFreeText', 'הערות'), formData.notes) : ''}

      ${(() => {
        const tasks = Array.isArray(formData.workPlanTasks) ? formData.workPlanTasks.filter(task => task.title || task.name) : [];
        if (!tasks.length) return '';
        const rows = tasks.map((task) => {
          const title = task.title || task.name || task.taskTitle || task.taskName || '';
          const start = task.startMonth ?? task.start_month ?? '';
          const end = task.endMonth ?? task.end_month ?? '';
          return `<tr><td>${escapeHtml(title)}</td><td>${escapeHtml(String(start))}</td><td>${escapeHtml(String(end))}</td></tr>`;
        }).join('');
        return `
          <div class="section">
            ${buildSectionHeading(t('workPlan', 'תוכנית עבודה'))}
            <table>
              <thead><tr>
                <th>${ns('משימה', 'Task')}</th>
                <th>${ns('חודש התחלה', 'Start month')}</th>
                <th>${ns('חודש סיום', 'End month')}</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      })()}

      ${buildDocFooter(
        isEn
          ? `Generated on ${new Date().toLocaleString('en-US')}`
          : `נוצר ב-${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL')}`
      )}
    `;

    exportPrintableHtmlToPdf({
      title: isEn
        ? `Research Proposal – ${formData.projectTitle || 'Form'}`
        : `הגשה לקרנות מחקר - ${formData.projectTitle || 'טופס'}`,
      htmlBody,
      dir: isEn ? 'ltr' : 'rtl',
      lang: isEn ? 'en' : 'he',
    });
  };

  const handleWorkPlanTasksChange = useCallback((tasks) => {
    updateFormData((prev) => {
      const prevTasks = prev.workPlanTasks || [];
      const nextTasks = tasks || [];
      if (prevTasks === nextTasks) return prev;
      if (JSON.stringify(prevTasks) === JSON.stringify(nextTasks)) return prev;
      markFormDirty();
      return {
        ...prev,
        workPlanTasks: nextTasks,
      };
    });
  }, []);

  const handleProposalDocxParsed = useCallback((parsed) => {
    if (!parsed || typeof parsed !== 'object') return;

    markFormDirty();
    updateFormData((prev) => ({
      ...prev,
      projectTitle: parsed.projectTitle || prev.projectTitle,
      abstract: parsed.abstract || prev.abstract,
      scientificBackground: parsed.scientificBackground || prev.scientificBackground,
      researchObjectives: parsed.researchObjectives || prev.researchObjectives,
      detailedDescription: parsed.detailedDescription || prev.detailedDescription,
      significanceInnovation: parsed.significanceInnovation || prev.significanceInnovation,
      applicability: parsed.applicability || prev.applicability,
      principalInvestigatorName: parsed.principalInvestigatorName || prev.principalInvestigatorName,
      biographicalSummaryName: parsed.biographicalSummaryName || prev.biographicalSummaryName,
      biographicalSummaryPositionTitle:
        parsed.biographicalSummaryPositionTitle || prev.biographicalSummaryPositionTitle,
      bibliographyEducationTraining:
        Array.isArray(parsed.bibliographyEducationTraining) && parsed.bibliographyEducationTraining.length > 0
          ? parsed.bibliographyEducationTraining
          : prev.bibliographyEducationTraining,
      bibliographyPersonalStatement:
        parsed.bibliographyPersonalStatement || prev.bibliographyPersonalStatement,
      bibliographyPositionsAndHonors:
        parsed.bibliographyPositionsAndHonors || prev.bibliographyPositionsAndHonors,
      bibliographySelectedPublications:
        parsed.bibliographySelectedPublications || prev.bibliographySelectedPublications,
      bibliographyResearchSupport:
        parsed.bibliographyResearchSupport || prev.bibliographyResearchSupport,
      workPlanTasks:
        Array.isArray(parsed.workPlanTasks) && parsed.workPlanTasks.length > 0
          ? parsed.workPlanTasks
          : prev.workPlanTasks,
    }));

    if (Array.isArray(parsed.workPlanTasks) && parsed.workPlanTasks.length > 0) {
      setWorkPlanKey((key) => key + 1);
    }
  }, []);

  return (
    <div className="page-container">
      <div className="page-content research-submit-page">
        <div className="form-page-header">
          <h1>{t('submitResearchTitle', 'הגשה לקרנות מחקר')}</h1>
          <div className="form-page-header-aside">
            <ProposalDocxUpload onParsed={handleProposalDocxParsed} disabled={deleting} />
            <FormEditToolbar
              visible={Boolean(editId)}
              onCancelEdit={handleCancel}
              deleting={deleting}
              t={t}
            />
          </div>
        </div>
        <p className="welcome-text">
          {t('submitResearchSubtitle', 'מלאו את הפרטים הבאים כדי להגיש הצעת מחקר חדשה')}
        </p>

        <form onSubmit={handleSubmit} className="research-form">
          <BasicInfoSection
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            fundOptions={fundOptions}
            fundTypeOptions={fundTypeOptions}
            submissionPathOptions={submissionPathOptions}
            submissionTypeOptions={submissionTypeOptions}
            researcherRoleOptions={researcherRoleOptions}
            proposalStageOptions={proposalStageOptions}
          />

          <ResearchPeriodSection
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleDatePickerChange={handleDatePickerChange}
            formatDateForDisplay={formatDateForDisplay}
            convertDateToISO={convertDateToISO}
            startDatePickerRef={startDatePickerRef}
            endDatePickerRef={endDatePickerRef}
          />

          <BudgetSection
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleBudgetComponentChange={handleBudgetComponentChange}
            budgetComponents={budgetComponents}
            currencyOptions={currencyOptions}
          />

          <ResearchDescriptionSection
            formData={formData}
            handleChange={handleChange}
            onPolish={(improved) => {
              markFormDirty();
              updateFormData((prev) => ({ ...prev, ...improved }));
            }}
          />

          <PartnersSection
            formData={formData}
            hasPartners={hasPartners}
            setHasPartners={(value) => {
              markFormDirty();
              setHasPartners(value);
            }}
            handlePartnerChange={handlePartnerChange}
            addPartner={addPartner}
            removePartner={removePartner}
          />

          <DocumentsSection
            formData={formData}
            handleRequiredDocumentUpload={handleRequiredDocumentUpload}
            handleRemoveRequiredDocumentFile={handleRemoveRequiredDocumentFile}
            requiredDocuments={requiredDocuments}
            documentsUploading={documentsUploading}
          />

          <DigitalSignatureSection
            formData={formData}
            handleDigitalSignature={handleDigitalSignature}
          />

          <AdditionalInfoSection
            formData={formData}
            handleChange={handleChange}
            handleDatePickerChange={handleDatePickerChange}
            formatDateForDisplay={formatDateForDisplay}
            convertDateToISO={convertDateToISO}
            expectedDatePickerRef={expectedDatePickerRef}
            onPolish={(improved) => {
              markFormDirty();
              updateFormData((prev) => ({ ...prev, ...improved }));
            }}
          />

          {editId && loadingExisting ? (
            <div className="form-section">
              <h2>תוכנית עבודה / Gantt</h2>
              <p style={{ margin: 0, color: '#64748b' }}>טוען נתוני גאנט קיימים...</p>
            </div>
          ) : (
            <WorkPlanSection
              key={workPlanKey}
              initialTasks={formData.workPlanTasks || []}
              onTasksChange={handleWorkPlanTasksChange}
              readOnly={false}
              suppressParentSync={Boolean(editId && loadingExisting)}
            />
          )}

          <BibliographySection
            formData={formData}
            handleChange={handleChange}
            handleBibliographyEducationChange={handleBibliographyEducationChange}
            addBibliographyEducationRow={addBibliographyEducationRow}
            removeBibliographyEducationRow={removeBibliographyEducationRow}
            onPolish={(improved) => {
              markFormDirty();
              updateFormData((prev) => ({ ...prev, ...improved }));
            }}
          />

          {/* Form Actions */}
          <div className="form-actions">
            <div className="form-actions-start">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleCancel}
                disabled={deleting}
              >
                {t('cancel', 'ביטול')}
              </button>
              {showDeleteButton && (
                <button
                  type="button"
                  className="btn-delete"
                  onClick={handleDeleteResearch}
                  disabled={deleting}
                >
                  {deleting ? t('deleting', 'מוחק...') : t('deleteResearch', 'מחק הצעה')}
                </button>
              )}
              {showDraftButton && (
                <button type="button" className="btn-draft" onClick={handleSaveDraft} disabled={deleting || documentsUploading}>
                  {t('saveDraft', 'שמור כטיוטה')}
                </button>
              )}
            </div>
            <div className="form-actions-end">
              <button type="button" className="btn-export-pdf" onClick={handleExportPDF} disabled={deleting}>
                {t('exportPdfShort', 'ייצוא PDF')}
              </button>
              <button type="submit" className="btn-submit" disabled={deleting || loadingExisting || documentsUploading}>
                {userRole === 'RESEARCHER'
                  ? t('submitToAuthority', 'הגש לרשות המחקר')
                  : t('submitProposal', 'הגשת הצעה')}
              </button>
            </div>
          </div>
        </form>

        <ResearchProposalReviewAssistant
          formData={formData}
          onFillForm={(fields) => {
            markFormDirty();
            updateFormData((prev) => ({ ...prev, ...fields }));
          }}
        />
      </div>
    </div>
  );
};

export default NewResearch;
