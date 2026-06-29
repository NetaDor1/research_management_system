import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createNotification } from '../services/notifications';
import ResearchInfoSection from '../components/research/ResearchInfoSection';
import ResearchPeriodSection from '../components/research/ResearchPeriodSection';
import BudgetSection from '../components/research/BudgetSection';
import PartnersSection from '../components/research/PartnersSection';
import ResearchDescriptionSection from '../components/research/ResearchDescriptionSection';
import BibliographyDisplaySection from '../components/research/BibliographyDisplaySection';
import DocumentsDisplaySection from '../components/research/DocumentsDisplaySection';
import AdditionalInfoSection from '../components/research/AdditionalInfoSection';
import TasksSection from '../components/research/TasksSection';
import { canResearcherEditResearch, isDraft, normalizeResearchStatus } from '../utils/submissionStatus';
import { getAwardedPeriodUpdate, isResearchAwarded, resolveResearchPeriodDates } from '../utils/researchPeriod';
import WorkPlanSection from '../components/research/WorkPlanSection';
import './Page.css';
import './Research.css';
import {
  exportPrintableHtmlToPdf,
  escapeHtml,
  buildResearchProposalHeader,
  buildMetaSection,
  buildMetaTable,
  buildFormFieldsSection,
  buildFormFieldBlock,
  buildSectionHeading,
  buildDocFooter,
} from '../utils/exportPdf';
import { navigateBackOrFallback } from '../utils/navigation';
import { getBudgetComponentLabel } from '../utils/budgetComponents';

const ResearchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, userRole, user } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const locale = language === 'en' ? 'en-US' : 'he-IL';
  const [researchData, setResearchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [linkedPatents, setLinkedPatents] = useState([]);
  const [linkedPatentsLoading, setLinkedPatentsLoading] = useState(true);
  const [linkedPatentsError, setLinkedPatentsError] = useState('');
  const [linkedArticles, setLinkedArticles] = useState([]);
  const [linkedArticlesLoading, setLinkedArticlesLoading] = useState(true);
  const [linkedArticlesError, setLinkedArticlesError] = useState('');
  const [proposalStatus, setProposalStatus] = useState('pending');
  const [approvedBudgetInput, setApprovedBudgetInput] = useState('');
  const [approvedBudgetComponentsInput, setApprovedBudgetComponentsInput] = useState({});
  const [savingProposalDecision, setSavingProposalDecision] = useState(false);
  const [quickDecisionLoading, setQuickDecisionLoading] = useState(false);

  useEffect(() => {
    const fetchResearch = async () => {
      if (!db) {
        setError(t('dbNotInitialized', 'מסד הנתונים לא מאותחל'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const docRef = doc(db, 'researchProposals', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (userRole === 'RESEARCHER' && data.researcherId !== user?.id) {
            setError(t('noPermissionViewResearch', 'אין הרשאה לצפות במחקר זה'));
            setLoading(false);
            return;
          }

          if (userRole === 'ADMIN' && isDraft(data)) {
            setError(t('draftNotVisibleToAdmin', 'טיוטה זו אינה זמינה לרשות המחקר עד להגשה'));
            setLoading(false);
            return;
          }

          setResearchData({
            ...data,
            status: normalizeResearchStatus(data.status),
          });
        } else {
          setError(t('researchNotFound', 'המחקר לא נמצא'));
        }
      } catch (err) {
        console.error('Error fetching research:', err);
        setError(t('loadResearchError', 'שגיאה בטעינת פרטי המחקר'));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResearch();
    }
  }, [id, userRole, user?.id, t]);

  // Fetch tasks
  useEffect(() => {
    if (!id || !db) return;

    const tasksRef = collection(db, 'researchProposals', id, 'tasks');
    const unsubscribe = onSnapshot(
      tasksRef, 
      (snapshot) => {
        const tasksList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const sortedTasks = tasksList.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        setTasks(sortedTasks);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
        if (error.code !== 'permission-denied') {
          console.error('Tasks fetch error:', error.message);
        }
      }
    );

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!researchData) return;
    setProposalStatus(researchData.status || 'pending');
    const requestedComponents = researchData.budgetComponents || {};
    const existingApprovedComponents = researchData.approvedBudgetComponents || {};
    const nextApprovedComponents = {};
    Object.keys(requestedComponents).forEach((key) => {
      const currentValue = existingApprovedComponents[key];
      nextApprovedComponents[key] =
        currentValue !== undefined && currentValue !== null
          ? String(currentValue)
          : String(requestedComponents[key] ?? '');
    });
    setApprovedBudgetComponentsInput(nextApprovedComponents);
  }, [researchData]);

  useEffect(() => {
    const requestedComponents = researchData?.budgetComponents || {};
    const total = Object.keys(requestedComponents).reduce((sum, key) => {
      const normalized = String(approvedBudgetComponentsInput[key] ?? '').replace(/,/g, '').trim();
      if (!normalized) return sum;
      const n = Number(normalized);
      return Number.isNaN(n) ? sum : sum + n;
    }, 0);
    setApprovedBudgetInput(String(total));
  }, [approvedBudgetComponentsInput, researchData]);

  useEffect(() => {
    if (!id || !db) return;

    setLinkedArticlesLoading(true);
    setLinkedArticlesError('');

    const articlesQuery = query(
      collection(db, 'articles'),
      where('researchProposalId', '==', id)
    );

    const unsubscribe = onSnapshot(
      articlesQuery,
      (snapshot) => {
        const articlesList = snapshot.docs.map(docItem => ({
          id: docItem.id,
          ...docItem.data()
        }));
        setLinkedArticles(articlesList);
        setLinkedArticlesLoading(false);
      },
      (error) => {
        console.error('Error fetching linked articles:', error);
        setLinkedArticlesError(t('loadingLinkedArticlesError', 'שגיאה בטעינת מאמרים מקושרים'));
        setLinkedArticles([]);
        setLinkedArticlesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id, t]);

  useEffect(() => {
    if (!id || !db) return;

    setLinkedPatentsLoading(true);
    setLinkedPatentsError('');

    const patentsQuery = query(
      collection(db, 'patents'),
      where('researchProposalId', '==', id)
    );

    const unsubscribe = onSnapshot(
      patentsQuery,
      (snapshot) => {
        const patentsList = snapshot.docs.map(docItem => ({
          id: docItem.id,
          ...docItem.data()
        }));
        setLinkedPatents(patentsList);
        setLinkedPatentsLoading(false);
      },
      (error) => {
        console.error('Error fetching linked patents:', error);
        setLinkedPatentsError(t('loadingLinkedPatentsError', 'שגיאה בטעינת פטנטים מקושרים'));
        setLinkedPatents([]);
        setLinkedPatentsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id, t]);

  const getBackPath = () => (userRole === 'RESEARCHER' ? '/' : '/research');

  const createTaskNotification = async ({ researcherId, title, message, taskId, link, eventKey, type = 'task' }) => {
    if (!researcherId) return;
    await createNotification({
      userId: researcherId,
      title,
      message,
      type,
      entityType: 'task',
      entityId: taskId,
      link,
      eventKey
    });
  };

  const canChangeProposalStatus = () =>
    Boolean(
      researchData &&
      (isAdmin() || (userRole === 'RESEARCHER' && researchData.researcherId === user?.id))
    );

  const handleQuickDecision = async (newStatus) => {
    if (!canChangeProposalStatus() || !id || !db || !researchData) return;
    if (newStatus === 'awarded' || newStatus === 'rejected') {
      const label = newStatus === 'awarded' ? 'לאשר' : 'לדחות';
      if (!window.confirm(`האם אתה בטוח שברצונך ${label} את הצעת המחקר הזו?`)) return;
    }

    setQuickDecisionLoading(true);
    try {
      const periodUpdate = getAwardedPeriodUpdate(researchData, newStatus);
      await updateDoc(doc(db, 'researchProposals', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...periodUpdate,
      });

      const proposalTitle = researchData.projectTitle || researchData.title || '';
      if (isAdmin() && researchData.researcherId) {
        const notifTitle =
          newStatus === 'awarded'
            ? 'הצעת המחקר אושרה'
            : newStatus === 'rejected'
              ? 'הצעת המחקר נדחתה'
              : 'הצעת המחקר בהמתנה';
        const notifMsg =
          newStatus === 'awarded'
            ? `הצעת המחקר "${proposalTitle}" אושרה.`
            : newStatus === 'rejected'
              ? `הצעת המחקר "${proposalTitle}" נדחתה.`
              : `הצעת המחקר "${proposalTitle}" הועברה לסטטוס בהמתנה.`;
        await createNotification({
          userId: researchData.researcherId,
          title: notifTitle,
          message: notifMsg,
          type: 'research_status',
          entityType: 'research',
          entityId: id,
          link: `/research/${id}`,
          eventKey: `research_status:${id}:${newStatus}:${Date.now()}`,
        });
      } else if (!isAdmin()) {
        const statusLabel = newStatus === 'awarded' ? 'זכייה' : newStatus === 'rejected' ? 'נדחה' : 'בהמתנה';
        await createNotification({
          userId: 'ADMIN',
          targetRole: 'ADMIN',
          title: 'עדכון סטטוס הצעת מחקר',
          message: `${user?.name || 'חוקר'} עדכן/ה את סטטוס הצעת המחקר "${proposalTitle}" ל-${statusLabel}.`,
          type: 'research_status_update',
          entityType: 'research',
          entityId: id,
          link: `/research/${id}`,
          eventKey: `research_status:${id}:${newStatus}:${Date.now()}`,
        });
      }

      setResearchData((prev) => ({ ...prev, status: newStatus, ...periodUpdate }));
      setProposalStatus(newStatus);
    } catch (err) {
      console.error('Error updating research status:', err);
      alert(`שגיאה בעדכון הסטטוס: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setQuickDecisionLoading(false);
    }
  };

  const handleSaveProposalDecision = async () => {
    if (!isAdmin() || !id || !db || !researchData) return;

    const shouldSetApprovedBudget = proposalStatus === 'awarded';
    let parsedApprovedBudget = null;

    const requestedComponents = researchData.budgetComponents || {};
    const approvedBudgetComponentsPayload = {};
    let approvedComponentsTotal = 0;

    Object.keys(requestedComponents).forEach((componentKey) => {
      const rawValue = approvedBudgetComponentsInput[componentKey];
      const normalized = String(rawValue || '').replace(/,/g, '').trim();
      if (!normalized) {
        approvedBudgetComponentsPayload[componentKey] = null;
        return;
      }
      const parsed = Number(normalized);
      if (Number.isNaN(parsed) || parsed < 0) {
        approvedBudgetComponentsPayload[componentKey] = NaN;
        return;
      }
      approvedBudgetComponentsPayload[componentKey] = parsed;
      approvedComponentsTotal += parsed;
    });

    const hasInvalidApprovedComponent = Object.values(approvedBudgetComponentsPayload).some(
      (value) => Number.isNaN(value)
    );
    if (hasInvalidApprovedComponent) {
      alert('יש להזין סכומים תקינים (מספרים חיוביים או 0) בכל רכיבי התקציב שהוזנו.');
      return;
    }

    if (shouldSetApprovedBudget) {
      parsedApprovedBudget = approvedComponentsTotal;
    }

    setSavingProposalDecision(true);
    try {
      const periodUpdate = getAwardedPeriodUpdate(researchData, proposalStatus);
      const payload = {
        status: proposalStatus,
        approvedBudget: shouldSetApprovedBudget ? parsedApprovedBudget : null,
        approvedBudgetComponents: approvedBudgetComponentsPayload,
        updatedAt: serverTimestamp(),
        ...periodUpdate,
      };

      await updateDoc(doc(db, 'researchProposals', id), payload);

      if (researchData.researcherId) {
        const titleByStatus =
          proposalStatus === 'awarded'
            ? 'הצעת המחקר אושרה'
            : proposalStatus === 'rejected'
              ? 'הצעת המחקר נדחתה'
              : 'סטטוס הצעת מחקר עודכן';

        const messageByStatus =
          proposalStatus === 'awarded'
            ? `הצעת המחקר "${researchData.projectTitle || researchData.title || ''}" אושרה. תקציב שאושר: ${parsedApprovedBudget?.toLocaleString('he-IL')} ₪`
            : proposalStatus === 'rejected'
              ? `הצעת המחקר "${researchData.projectTitle || researchData.title || ''}" נדחתה.`
              : `סטטוס הצעת המחקר "${researchData.projectTitle || researchData.title || ''}" עודכן להמתנה.`;

        await createNotification({
          userId: researchData.researcherId,
          title: titleByStatus,
          message: messageByStatus,
          type: 'research_status',
          entityType: 'research',
          entityId: id,
          link: `/research/${id}`,
          eventKey: `research_status:${id}:${proposalStatus}:${Date.now()}`,
        });
      }

      setResearchData((prev) => ({
        ...prev,
        status: proposalStatus,
        approvedBudget: shouldSetApprovedBudget ? parsedApprovedBudget : null,
        approvedBudgetComponents: approvedBudgetComponentsPayload,
        ...periodUpdate,
      }));

      alert('סטטוס ההצעה עודכן בהצלחה.');
    } catch (err) {
      console.error('Error updating proposal decision:', err);
      alert(`שגיאה בעדכון סטטוס ההצעה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setSavingProposalDecision(false);
    }
  };

  // Handle adding a new task
  const handleAddTask = async (formData) => {
    if (!isAdmin() || !id || !db) {
      console.error('Cannot add task: Missing admin permission, id, or db');
      return;
    }

    setUploading(true);
    try {
      // Get research proposal data to extract researcherId
      const researchDoc = await getDoc(doc(db, 'researchProposals', id));
      if (!researchDoc.exists()) {
        alert('הצעת המחקר לא נמצאה');
        setUploading(false);
        return;
      }
      const researchData = researchDoc.data();
      const researcherId = researchData.researcherId;

      if (!researcherId) {
        alert('לא נמצא מזהה חוקר בהצעת המחקר');
        setUploading(false);
        return;
      }

      console.log('Adding task for researcher:', researcherId);

      // Convert dueDate string to Timestamp if provided
      let dueDateTimestamp = null;
      let dueDateString = null;
      if (formData.dueDate) {
        try {
          const dueDate = new Date(formData.dueDate);
          dueDateTimestamp = Timestamp.fromDate(dueDate);
          dueDateString = formData.dueDate; // Keep as YYYY-MM-DD for calendar
          console.log('Task due date:', dueDateString);
        } catch (e) {
          console.error('Error converting dueDate:', e);
        }
      }

      // Upload admin-attached files if any
      const attachments = [];
      if (formData.files && formData.files.length > 0) {
        for (const file of formData.files) {
          const fileRef = ref(storage, `researchProposals/${id}/tasks/attachments/${Date.now()}-${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          attachments.push({ name: file.name, url, uploadedAt: new Date().toISOString() });
        }
      }

      // Prepare task data for subcollection
      const taskData = {
        title: formData.title,
        description: formData.description || '',
        dueDate: dueDateTimestamp,
        createdAt: serverTimestamp(),
        createdBy: user?.name || 'Admin',
        researcherId,
        status: 'pending',
        submissions: [],
        attachments
      };

      // Save task in research proposal subcollection
      const tasksRef = collection(db, 'researchProposals', id, 'tasks');
      const taskDocRef = await addDoc(tasksRef, taskData);
      const taskId = taskDocRef.id;
      console.log('✅ Task saved to subcollection with ID:', taskId);

      // Also save to global tasks collection for calendar (only if dueDate exists)
      // Note: This might fail due to Firestore security rules - task is already saved in subcollection
      if (dueDateString) {
        try {
          const globalTaskData = {
            id: taskId,
            title: formData.title,
            dueDate: dueDateString, // YYYY-MM-DD format for calendar
            status: 'open', // 'open' for pending tasks
            researcherId: researcherId,
            researchProposalId: id, // Link back to research proposal
            createdAt: serverTimestamp()
          };

          const globalTasksRef = collection(db, 'tasks');
          const globalTaskDocRef = await addDoc(globalTasksRef, globalTaskData);
          console.log('✅ Task saved to global tasks collection for calendar:', {
            globalTaskId: globalTaskDocRef.id,
            taskId,
            dueDate: dueDateString,
            researcherId
          });
        } catch (globalTaskError) {
          // Task is already saved in subcollection, so we don't fail the whole operation
          console.warn('⚠️ Failed to save task to global tasks collection (calendar):', globalTaskError.message);
          console.warn('Task is still saved in subcollection and will be visible in research proposal');
          console.warn('To fix: Update Firestore security rules to allow write to "tasks" collection');
          // Don't throw - task is already saved successfully in subcollection
        }
      } else {
        console.log('⚠️ Task has no dueDate, skipping calendar collection (task still saved in subcollection)');
      }

      await createTaskNotification({
        researcherId,
        title: 'משימה חדשה',
        message: `נוספה משימה חדשה: "${formData.title}"${dueDateString ? ` (תאריך יעד: ${new Date(dueDateString).toLocaleDateString('he-IL')})` : ''}.`,
        taskId,
        link: `/research/${id}#tasks`,
        eventKey: `task_created:${taskId}`
      });

      alert('המשימה נוספה בהצלחה!');
    } catch (err) {
      console.error('❌ Error adding task:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      alert(`שגיאה בהוספת משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle editing a task
  const handleEditTask = async (taskId, formData) => {
    if (!isAdmin() || !id || !db || !taskId) return;

    setUploading(true);
    try {
      const taskRef = doc(db, 'researchProposals', id, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      const existingTask = taskSnap.exists() ? taskSnap.data() : null;
      const researcherId = existingTask?.researcherId || researchData?.researcherId;
      let dueDateTimestamp = null;
      let dueDateString = null;
      if (formData.dueDate) {
        try {
          const dueDate = new Date(formData.dueDate);
          dueDateTimestamp = Timestamp.fromDate(dueDate);
          dueDateString = formData.dueDate;
        } catch (e) {
          console.error('Error converting dueDate:', e);
        }
      }

      // Upload new files and merge with kept existing attachments
      const keptAttachments = formData.existingAttachments || [];
      const newAttachments = [];
      if (formData.files && formData.files.length > 0) {
        for (const file of formData.files) {
          const fileRef = ref(storage, `researchProposals/${id}/tasks/attachments/${Date.now()}-${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          newAttachments.push({ name: file.name, url, uploadedAt: new Date().toISOString() });
        }
      }

      await updateDoc(taskRef, {
        title: formData.title,
        description: formData.description || '',
        dueDate: dueDateTimestamp,
        attachments: [...keptAttachments, ...newAttachments],
        updatedAt: serverTimestamp()
      });

      if (dueDateString) {
        const globalTasksQuery = query(
          collection(db, 'tasks'),
          where('id', '==', taskId)
        );
        const globalTasksSnapshot = await getDocs(globalTasksQuery);
        if (!globalTasksSnapshot.empty) {
          const globalTaskDoc = globalTasksSnapshot.docs[0];
          await updateDoc(globalTaskDoc.ref, {
            title: formData.title,
            dueDate: dueDateString
          });
        }
      }

      const dueDateLabel = dueDateString
        ? new Date(dueDateString).toLocaleDateString('he-IL')
        : '';

      await createTaskNotification({
        researcherId,
        title: 'עדכון משימה',
        message: dueDateLabel
          ? `תאריך הגשת "${formData.title}" עודכן ל-${dueDateLabel}.`
          : `המשימה "${formData.title}" עודכנה.`,
        taskId,
        link: `/research/${id}#tasks`,
        eventKey: `task_updated:${taskId}:${Date.now()}`
      });

      alert('המשימה עודכנה בהצלחה!');
    } catch (err) {
      console.error('Error updating task:', err);
      alert(`שגיאה בעדכון משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId) => {
    if (!isAdmin() || !id || !db || !taskId) return;

    if (!window.confirm('האם אתה בטוח שברצונך למחוק את המשימה הזו?')) {
      return;
    }

    setUploading(true);
    try {
      const taskRef = doc(db, 'researchProposals', id, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      const existingTask = taskSnap.exists() ? taskSnap.data() : null;
      const researcherId = existingTask?.researcherId || researchData?.researcherId;
      const taskTitle = existingTask?.title || 'משימה';
      await deleteDoc(taskRef);

      const globalTasksQuery = query(
        collection(db, 'tasks'),
        where('id', '==', taskId)
      );
      const globalTasksSnapshot = await getDocs(globalTasksQuery);
      if (!globalTasksSnapshot.empty) {
        const globalTaskDoc = globalTasksSnapshot.docs[0];
        await deleteDoc(globalTaskDoc.ref);
      }

      await createTaskNotification({
        researcherId,
        title: 'משימה נמחקה',
        message: `המשימה "${taskTitle}" נמחקה.`,
        taskId,
        link: `/research/${id}#tasks`,
        eventKey: `task_deleted:${taskId}`,
        type: 'task_deleted'
      });

      alert('המשימה נמחקה בהצלחה!');
    } catch (err) {
      console.error('Error deleting task:', err);
      alert(`שגיאה במחיקת משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!loading && location.hash === '#tasks') {
      const target = document.getElementById('research-tasks');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [loading, location.hash]);

  const formatDateForLocale = (value) => {
    if (!value) return t('notSpecified', 'לא צוין');
    try {
      if (value && typeof value.toDate === 'function') {
        return value.toDate().toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL');
      }
      if (value && value.seconds) {
        return new Date(value.seconds * 1000).toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL');
      }
      if (typeof value === 'string') {
        return new Date(value).toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL');
      }
      return String(value);
    } catch {
      return String(value);
    }
  };

  const handleExportPDF = () => {
    if (!researchData) return;

    const titleValue = researchData.projectTitle || researchData.title || t('notSpecified', 'לא צוין');
    const pdfTitle = `${t('researchDetailsTitle', 'פרטי מחקר')} - ${titleValue}`;
    const dir = language === 'en' ? 'ltr' : 'rtl';
    const lang = language === 'en' ? 'en' : 'he';

    const budgetComponents = researchData.budgetComponents || {};
    const partners = Array.isArray(researchData.partners) ? researchData.partners : [];
    const workPlanTasks = Array.isArray(researchData.workPlanTasks) ? researchData.workPlanTasks : [];

    const budgetRowsHtml = Object.entries(budgetComponents)
      .map(([k, v]) => {
        return `<tr><td>${escapeHtml(getBudgetComponentLabel(k, t))}</td><td>${escapeHtml(v)}</td></tr>`;
      })
      .join('');

    const budgetTableHtml = budgetRowsHtml
      ? `
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(t('budgetComponentsLabel', 'רכיבי התקציב'))}</th>
              <th>${escapeHtml(t('amount', 'כמות'))}</th>
            </tr>
          </thead>
          <tbody>
            ${budgetRowsHtml}
          </tbody>
        </table>
      `
      : '';

    const notSpecified = t('notSpecified', 'לא צוין');
    const val = (v) => (v === null || v === undefined || v === '' ? notSpecified : String(v));

    const partnersHtml = partners.length
      ? partners
          .map((p, idx) => {
            const name = val(p.name);
            const email = val(p.email);
            const institution = val(p.institution);
            const country = p.country ? val(p.country) : '';
            return `
              <div class="partner-block">
                <div class="partner-block-title">${escapeHtml(`${t('partner', 'שותף')} ${idx + 1}`)}</div>
                ${buildFormFieldBlock(t('partnerName', 'שם השותף'), name)}
                ${buildFormFieldBlock(t('partnerEmail', 'אימייל של השותף'), email)}
                ${buildFormFieldBlock(t('partnerInstitution', 'המוסד של השותף'), institution)}
                ${country ? buildFormFieldBlock(t('partnerCountry', 'מדינה שבה השותף נמצא'), country) : ''}
              </div>
            `;
          })
          .join('')
      : buildFormFieldBlock(t('partnersProjectTitle', 'שותפים לפרוייקט'), notSpecified);

    const workPlanTasksHtml = workPlanTasks.length
      ? `
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(t('task', 'משימה'))}</th>
              <th>${escapeHtml(language === 'en' ? 'Start month' : 'חודש התחלה')}</th>
              <th>${escapeHtml(language === 'en' ? 'End month' : 'חודש סיום')}</th>
            </tr>
          </thead>
          <tbody>
            ${workPlanTasks
              .map((task) => {
                const title = task.title || task.name || task.taskTitle || task.taskName || t('notSpecified', 'לא צוין');
                const startMonth = task.startMonth ?? task.start_month ?? '';
                const endMonth = task.endMonth ?? task.end_month ?? '';
                const startLabel = startMonth !== '' ? String(startMonth) : t('notSpecified', 'לא צוין');
                const endLabel = endMonth !== '' ? String(endMonth) : t('notSpecified', 'לא צוין');
                return `<tr><td>${escapeHtml(title)}</td><td>${escapeHtml(startLabel)}</td><td>${escapeHtml(endLabel)}</td></tr>`;
              })
              .join('')}
          </tbody>
        </table>
      `
      : '';

    const isEn = language === 'en';

    const headerHtml = buildResearchProposalHeader({
      titleHe: isEn ? 'Research Program – Full Proposal' : 'תכנית מחקר - הצעה מלאה',
      titleEn: isEn ? '' : 'RESEARCH PROPOSAL',
      metaLines: [
        { label: isEn ? 'Title' : 'כותרת', value: titleValue },
        {
          label: isEn ? 'Project coordinator' : 'רכז הפרויקט',
          value: val(researchData.researcherName),
        },
      ],
    });

    const htmlBody = `
      ${headerHtml}

      ${buildMetaSection(t('generalDetails', 'פרטים כלליים'), [
        [t('projectTitleLabel', 'כותרת הפרוייקט שהוגש לקרן חיצונית'), titleValue],
        [t('fundNameLabel', 'שם הקרן אליה הוגשה הבקשה'), val(researchData.fundName)],
        [t('fundTypeLabel', 'סוג הקרן'), val(researchData.fundType)],
        [t('submissionPathLabel', 'מסלול ההגשה לקרן'), val(researchData.submissionPath)],
        [t('researcherRoleLabel', 'תפקיד החוקר בהצעת המחקר'), val(researchData.researcherRole)],
        [t('proposalStageLabel', 'שלב ההצעה'), val(researchData.proposalStage)],
        [t('submissionTypeLabel', 'סוג הגשה'), val(researchData.submissionType)],
        [t('researcher', 'חוקר'), val(researchData.researcherName)],
      ])}

      ${isResearchAwarded(researchData) ? (() => {
        const { startDate, endDate } = resolveResearchPeriodDates(researchData);
        return buildMetaSection(t('researchPeriod', 'תקופת המחקר'), [
          [t('totalResearchYears', 'סה"כ תקופת המחקר בשנים'), val(researchData.researchDurationYears)],
          [t('researchPeriodStartDate', 'תאריך תחילת המחקר'), startDate ? formatDateForLocale(researchData.researchStartDate) : val(null)],
          [t('researchPeriodEndDate', 'תאריך סיום המחקר'), endDate ? endDate.toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL') : val(null)],
        ]);
      })() : ''}

      <div class="section">
        ${buildSectionHeading(t('budgetTitle', 'תקציב'))}
        ${buildMetaTable([
          [t('totalBudgetRequested', 'סה"כ התקציב המבוקש (חישוב אוטומטי)'), val(researchData.totalBudget)],
          [t('budgetCurrency', 'מטבע התקציב'), val(researchData.currency || 'ILS')],
          [t('budgetConvertedIls', 'התקציב המתורגם לשקלים (חישוב אוטומטי)'), val(researchData.convertedBudget)],
        ])}
        ${budgetTableHtml}
      </div>

      <div class="section">
        ${buildSectionHeading(t('partnersProjectTitle', 'שותפים לפרוייקט'))}
        ${partnersHtml}
      </div>

      ${buildFormFieldsSection(t('researchDescriptionTitle', 'תיאור המחקר'), [
        [t('abstractLabel', 'תקציר'), val(researchData.abstract)],
        [t('scientificBackgroundLabel', 'רקע מדעי ומצב טכנולוגי חדש'), val(researchData.scientificBackground)],
        [t('researchObjectivesLabel', 'מטרות מחקר ומטרות ספציפיות'), val(researchData.researchObjectives)],
        [t('detailedDescriptionLabel', 'תיאור מפורט של המחקר המוצע'), val(researchData.detailedDescription)],
        [t('significanceLabel', 'משמעות, חדשנות ותועלת פוטנציאלית'), val(researchData.significanceInnovation)],
        [t('applicabilityLabel', 'ישימות'), val(researchData.applicability)],
      ])}

      ${buildFormFieldsSection(t('additionalInfoTitle', 'מידע נוסף'), [
        [t('expectedResponseDateLabel', 'תאריך משוער'), formatDateForLocale(researchData.expectedResponseDate)],
        [t('notesFreeText', 'הערות'), val(researchData.notes)],
      ])}

      ${
        researchData.digitalSignature?.signed
          ? buildMetaSection(t('digitalSignatureTitle', 'חתימה דיגיטלית'), [
              [t('signedBy', 'חתום על ידי'), val(researchData.digitalSignature.signer)],
              [t('signatureDate', 'תאריך חתימה'), formatDateForLocale(researchData.digitalSignature.date)],
            ])
          : ''
      }

      ${
        workPlanTasksHtml
          ? `
          <div class="section">
            ${buildSectionHeading(t('workPlan', 'Work plan and Gantt'))}
            ${workPlanTasksHtml}
          </div>
        `
          : ''
      }

      ${buildDocFooter(
        language === 'en'
          ? `Generated on ${new Date().toLocaleString('en-US')}`
          : `נוצר ב-${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL')}`
      )}
    `;

    exportPrintableHtmlToPdf({ title: pdfTitle, htmlBody, dir, lang });
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <button 
          onClick={() => navigateBackOrFallback(navigate, getBackPath())}
          style={{
            marginBottom: '20px',
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ← {t('back', 'חזרה')}
        </button>

        {loading && (
          <div className="no-results">
            <p>{t('loadingResearchDetails', 'טוען פרטי מחקר...')}</p>
          </div>
        )}

        {error && (
          <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && researchData && (
          <div style={{ textAlign }}>
            {/*
              Edit permissions:
              - Admin can always edit.
              - Researcher can edit only until proposal is approved (awarded).
            */}
            {(() => {
              const canEditResearch =
                isAdmin() || (userRole === 'RESEARCHER' && canResearcherEditResearch(researchData));
              return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, color: '#333' }}>{t('researchDetailsTitle', 'פרטי מחקר')}</h1>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  style={{
                    padding: '10px 20px',
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  {t('exportPdf', 'ייצוא ל-PDF')}
                </button>
                {canEditResearch && (
                  <button
                    onClick={() => navigate(`/research/new?edit=${id}`)}
                    style={{
                      padding: '10px 20px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    ✏️ {t('editResearch', 'ערוך מחקר')}
                  </button>
                )}
              </div>
            </div>
              );
            })()}

            <ResearchInfoSection
              researchData={researchData}
              onMoveToPending={canChangeProposalStatus() ? () => handleQuickDecision('pending') : undefined}
              onQuickApprove={canChangeProposalStatus() ? () => handleQuickDecision('awarded') : undefined}
              onQuickReject={canChangeProposalStatus() ? () => handleQuickDecision('rejected') : undefined}
              quickDecisionLoading={quickDecisionLoading}
            />
            {isAdmin() && (
              <div
                style={{
                  background: '#f9f9f9',
                  padding: '24px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#667eea' }}>
                  {t('proposalApprovalTitle', 'אישור הצעת מחקר ומימון')}
                </h2>
                {(() => {
                  const currency = researchData.currency || 'ILS';
                  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
                  const rateToILS = currency === 'USD' ? 3.5 : currency === 'EUR' ? 3.8 : 1;
                  const approvedRaw = parseFloat(approvedBudgetInput) || 0;
                  const approvedILS = approvedRaw * rateToILS;
                  const showILS = currency !== 'ILS';
                  const components = researchData.budgetComponents || {};
                  const hasConversion = currency !== 'ILS';
                  const headerCols = hasConversion ? '1fr 170px 120px 1fr' : '1fr 170px 140px';
                  const sym = currencySymbol;
                  const rate = rateToILS;

                  return (
                <>
                <div>
                    <h3 style={{ marginTop: 0, marginBottom: '6px', fontSize: '16px' }}>
                      {t('budgetComponentsRequestedVsApproved', 'רכיבי תקציב: מבוקש מול התקבל')}
                    </h3>
                    {Object.keys(components).length === 0 ? (
                      <p style={{ color: '#888', fontSize: '14px', margin: '6px 0 0' }}>
                        {t('noBudgetComponents', 'לא הוגשו רכיבי תקציב בהצעה זו')}
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: headerCols, columnGap: '14px', rowGap: '0', alignItems: 'center' }}>
                        <div style={{ fontWeight: 'bold', color: '#888', fontSize: '12px', padding: '4px 10px', borderBottom: '1px solid #e2e8f0' }}>{t('budgetComponent', 'רכיב')}</div>
                        <div style={{ fontWeight: 'bold', color: '#888', fontSize: '12px', padding: '4px 10px', borderBottom: '1px solid #e2e8f0' }}>{t('requested', 'מבוקש')}</div>
                        <div style={{ fontWeight: 'bold', color: '#888', fontSize: '12px', padding: '4px 10px', borderBottom: '1px solid #e2e8f0' }}>{t('received', 'התקבל')} ({sym})</div>
                        {hasConversion && <div style={{ fontWeight: 'bold', color: '#888', fontSize: '12px', padding: '4px 10px', borderBottom: '1px solid #e2e8f0' }}>{t('convertedILS', 'המרה לשקלים')}</div>}
                        {Object.entries(components).map(([componentKey, requestedValue]) => {
                          const approvedVal = parseFloat(String(approvedBudgetComponentsInput[componentKey] ?? '').replace(/,/g, '')) || 0;
                          const convertedVal = approvedVal * rate;
                          const rowBg = { background: '#fff', padding: '8px 10px', borderBottom: '1px solid #f0f0f0' };
                          return (
                            <React.Fragment key={componentKey}>
                              <div style={{ ...rowBg, fontWeight: 'bold', color: '#334155', fontSize: '14px' }}>
                                {getBudgetComponentLabel(componentKey, t)}
                              </div>
                              <div style={{ ...rowBg, color: '#334155', fontSize: '14px' }}>
                                {`${sym} ${Number(requestedValue || 0).toLocaleString(locale, { style: 'decimal' })}`}
                              </div>
                              <div style={{ ...rowBg }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={approvedBudgetComponentsInput[componentKey] ?? ''}
                                  onChange={(e) =>
                                    setApprovedBudgetComponentsInput((prev) => ({
                                      ...prev,
                                      [componentKey]: e.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              {hasConversion && (
                                <div style={{ ...rowBg, color: '#2b6cb0', fontSize: '14px' }}>
                                  {approvedVal > 0 ? `₪ ${convertedVal.toLocaleString(locale, { style: 'decimal' })}` : '—'}
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'end', marginTop: '18px' }}>
                  <div style={{ width: '200px', flexShrink: 0 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>
                      {t('approvedBudgetLabel', 'סה"כ תקציב שהתקבל')} ({currencySymbol})
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={approvedRaw > 0 ? `${currencySymbol} ${approvedRaw.toLocaleString(locale, { style: 'decimal' })}` : ''}
                      readOnly
                      disabled
                      placeholder={t('autoCalculatedFromComponents', 'מחושב אוטומטית')}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        background: '#f1f5f9',
                        boxSizing: 'border-box',
                      }}
                    />
                    {showILS && <span style={{ display: 'block', height: '17px' }} />}
                  </div>

                  {showILS && (
                    <div style={{ width: '200px', flexShrink: 0 }}>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>
                        {t('approvedBudgetConvertedILS', 'מומר לשקלים (₪)')}
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={approvedRaw > 0 ? `₪ ${approvedILS.toLocaleString(locale, { style: 'decimal' })}` : ''}
                        readOnly
                        disabled
                        placeholder={t('autoCalculatedFromComponents', 'מחושב אוטומטית')}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          background: '#f1f5f9',
                          color: '#2b6cb0',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#888', marginTop: '3px', display: 'block' }}>
                        1 {currency} = {rateToILS} ₪
                      </span>
                    </div>
                  )}

                  <div style={{ flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={handleSaveProposalDecision}
                      disabled={savingProposalDecision}
                      style={{
                        padding: '10px 20px',
                        background: savingProposalDecision ? '#94a3b8' : '#2b6cb0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: savingProposalDecision ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {savingProposalDecision ? t('saving', 'שומר...') : t('saveDecision', 'שמור החלטה')}
                    </button>
                    {showILS && <span style={{ display: 'block', height: '17px' }} />}
                  </div>
                </div>
                </>
                  );
                })()}
              </div>
            )}
            <ResearchPeriodSection researchData={researchData} />
            <BudgetSection researchData={researchData} />
            <PartnersSection researchData={researchData} />
            <DocumentsDisplaySection researchData={researchData} />
            <ResearchDescriptionSection researchData={researchData} />
            <BibliographyDisplaySection researchData={researchData} />
            <AdditionalInfoSection researchData={researchData} />
            
            {researchData.workPlanTasks && researchData.workPlanTasks.length > 0 && (
              <WorkPlanSection
                initialTasks={researchData.workPlanTasks || []}
                readOnly={true}
              />
            )}
            
            {!linkedPatentsLoading && !linkedPatentsError && linkedPatents.length > 0 && (
              <div style={{
                background: '#f9f9f9',
                padding: '30px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>{t('linkedPatents', 'פטנטים מקושרים')}</h2>
                <div className="research-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                  {linkedPatents.map((patent) => (
                    <button
                      key={patent.id}
                      className="research-card"
                      style={{
                        padding: '14px',
                        minHeight: '100px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        maxWidth: '200px'
                      }}
                      onClick={() => navigate(`/patents/${patent.id}`)}
                    >
                      <h3 className="research-title" style={{ textAlign: 'center' }}>
                        {patent.title || patent.projectTitle || t('noTitle', 'ללא כותרת')}
                      </h3>
                      <p className="research-researcher" style={{ textAlign: 'center' }}>
                        {patent.researcherName || patent.researcher || t('researcher', 'חוקר')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!linkedArticlesLoading && !linkedArticlesError && linkedArticles.length > 0 && (
              <div style={{
                background: '#f9f9f9',
                padding: '30px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>{t('linkedArticles', 'מאמרים מקושרים')}</h2>
                <div className="research-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                  {linkedArticles.map((article) => (
                    <button
                      key={article.id}
                      className="research-card"
                      style={{
                        padding: '14px',
                        minHeight: '100px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        maxWidth: '200px'
                      }}
                      onClick={() => navigate(`/articles/${article.id}`)}
                    >
                      <h3 className="research-title" style={{ textAlign: 'center' }}>
                        {article.title || t('noTitle', 'ללא כותרת')}
                      </h3>
                      <p className="research-researcher" style={{ textAlign: 'center' }}>
                        {article.journalName || article.researcherName || t('articleLabel', 'מאמר')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {researchData.status === 'awarded' ? (
              <div id="research-tasks">
                <TasksSection
                  tasks={tasks}
                  researchProposalId={id}
                  isAdmin={isAdmin()}
                  onAddTask={handleAddTask}
                  onDeleteTask={handleDeleteTask}
                  onSaveEditTask={handleEditTask}
                  uploading={uploading}
                />
              </div>
            ) : (
              <div
                id="research-tasks"
                style={{
                  background: '#f9f9f9',
                  padding: '30px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h2 style={{ marginTop: 0, marginBottom: '12px', color: '#667eea' }}>
                  {t('tasksAndSubmissions', 'משימות והגשות')}
                </h2>
                <p style={{ margin: 0, color: '#555', lineHeight: 1.6 }}>
                  {t('tasksOnlyAfterAward', 'ניתן לחלק משימות ולהגיש מסמכים רק לאחר שהמחקר מאושר (זכה).')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchDetail;
