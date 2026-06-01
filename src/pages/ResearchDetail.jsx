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
import AdditionalInfoSection from '../components/research/AdditionalInfoSection';
import TasksSection from '../components/research/TasksSection';
import WorkPlanSection from '../components/research/WorkPlanSection';
import './Page.css';
import './Research.css';
import { exportPrintableHtmlToPdf, escapeHtml } from '../utils/exportPdf';
import { normalizeAcademicYear } from '../utils/academicYear';
import { navigateBackOrFallback } from '../utils/navigation';

const ResearchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, userRole, user } = useAuth();
  const { t, language } = useLanguage();
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

  useEffect(() => {
    const fetchResearch = async () => {
      if (!db) {
        setError('מסד הנתונים לא מאותחל');
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
            setError('אין הרשאה לצפות במחקר זה');
            setLoading(false);
            return;
          }

          setResearchData(data);
        } else {
          setError('המחקר לא נמצא');
        }
      } catch (err) {
        console.error('Error fetching research:', err);
        setError('שגיאה בטעינת פרטי המחקר');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResearch();
    }
  }, [id, userRole, user?.id]);

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
        setLinkedArticlesError('שגיאה בטעינת מאמרים מקושרים');
        setLinkedArticles([]);
        setLinkedArticlesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

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
        setLinkedPatentsError('שגיאה בטעינת פטנטים מקושרים');
        setLinkedPatents([]);
        setLinkedPatentsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

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
      const payload = {
        status: proposalStatus,
        approvedBudget: shouldSetApprovedBudget ? parsedApprovedBudget : null,
        approvedBudgetComponents: approvedBudgetComponentsPayload,
        updatedAt: serverTimestamp(),
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
    const displayAcademicYear = normalizeAcademicYear(
      researchData.academicYear,
      researchData.researchStartDate
    );
    const partners = Array.isArray(researchData.partners) ? researchData.partners : [];
    const workPlanTasks = Array.isArray(researchData.workPlanTasks) ? researchData.workPlanTasks : [];

    const budgetRowsHtml = Object.entries(budgetComponents)
      .map(([k, v]) => {
        return `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`;
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

    const partnersHtml = partners.length
      ? partners
          .map((p, idx) => {
            const name = p.name || t('notSpecified', 'לא צוין');
            const email = p.email || t('notSpecified', 'לא צוין');
            const institution = p.institution || t('notSpecified', 'לא צוין');
            const country = p.country || '';
            return `
              <div class="kv">
                <div class="k">${escapeHtml(`${t('partner', 'שותף')} ${idx + 1}`)}</div>
                <div class="v">
                  ${escapeHtml(`${t('partnerName', 'שם השותף')}: ${name}`)}<br/>
                  ${escapeHtml(`${t('partnerEmail', 'אימייל של השותף')}: ${email}`)}<br/>
                  ${escapeHtml(`${t('partnerInstitution', 'המוסד של השותף')}: ${institution}`)}
                  ${country ? `<br/>${escapeHtml(`${t('partnerCountry', 'מדינה שבה השותף נמצא')}: ${country}`)}` : ''}
                </div>
              </div>
            `;
          })
          .join('')
      : `<div class="muted">${escapeHtml(t('notSpecified', 'לא צוין'))}</div>`;

    const workPlanTasksHtml = workPlanTasks.length
      ? `
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(t('task', 'משימה'))}</th>
              <th>${escapeHtml(t('status', 'סטטוס'))}</th>
              <th>${escapeHtml(t('dueDate', 'תאריך יעד'))}</th>
            </tr>
          </thead>
          <tbody>
            ${workPlanTasks
              .map((task) => {
                const title = task.title || task.name || t('notSpecified', 'לא צוין');
                const status = task.status || '';
                const due = formatDateForLocale(task.dueDate || task.targetDate || task.date);
                return `<tr><td>${escapeHtml(title)}</td><td>${escapeHtml(status)}</td><td>${escapeHtml(due)}</td></tr>`;
              })
              .join('')}
          </tbody>
        </table>
      `
      : '';

    const htmlBody = `
      <h1>${escapeHtml(pdfTitle)}</h1>

      <div class="section">
        <h2>${escapeHtml(t('generalDetails', 'פרטים כלליים'))}</h2>
        <div class="grid">
          <div class="kv"><div class="k">${escapeHtml(t('projectTitleLabel', 'כותרת הפרוייקט שהוגש לקרן חיצונית'))}</div><div class="v">${escapeHtml(titleValue)}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('fundNameLabel', 'שם הקרן אליה הוגשה הבקשה'))}</div><div class="v">${escapeHtml(researchData.fundName || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('fundTypeLabel', 'סוג הקרן'))}</div><div class="v">${escapeHtml(researchData.fundType || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('submissionPathLabel', 'מסלול ההגשה לקרן'))}</div><div class="v">${escapeHtml(researchData.submissionPath || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('researcherRoleLabel', 'תפקיד החוקר בהצעת המחקר'))}</div><div class="v">${escapeHtml(researchData.researcherRole || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('proposalStageLabel', 'שלב ההצעה'))}</div><div class="v">${escapeHtml(researchData.proposalStage || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('submissionTypeLabel', 'סוג הגשה'))}</div><div class="v">${escapeHtml(researchData.submissionType || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('researcher', 'חוקר'))}</div><div class="v">${escapeHtml(researchData.researcherName || t('notSpecified', 'לא צוין'))}</div></div>
        </div>
      </div>

      <div class="section">
        <h2>${escapeHtml(t('researchPeriod', 'תקופת המחקר'))}</h2>
        <div class="grid">
          <div class="kv"><div class="k">${escapeHtml(t('startDateLabel', 'תאריך לועזי של תחילת המחקר (dd/mm/yyyy)'))}</div><div class="v">${escapeHtml(formatDateForLocale(researchData.researchStartDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('endDateLabel', 'תאריך לועזי של סוף המחקר (dd/mm/yyyy)'))}</div><div class="v">${escapeHtml(formatDateForLocale(researchData.researchEndDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('totalResearchYears', 'סה"כ תקופת המחקר בשנים (חישוב אוטומטי)'))}</div><div class="v">${escapeHtml(researchData.researchDurationYears || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('academicYearLabel', 'שנה אקדמית (תרגום אוטומטי)'))}</div><div class="v">${escapeHtml(displayAcademicYear || t('notSpecified', 'לא צוין'))}</div></div>
        </div>
      </div>

      <div class="section">
        <h2>${escapeHtml(t('budgetTitle', 'תקציב'))}</h2>
        <div class="grid">
          <div class="kv"><div class="k">${escapeHtml(t('totalBudgetRequested', 'סה"כ התקציב המבוקש (חישוב אוטומטי)'))}</div><div class="v">${escapeHtml(researchData.totalBudget || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('budgetCurrency', 'מטבע התקציב'))}</div><div class="v">${escapeHtml(researchData.currency || 'ILS')}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('budgetConvertedIls', 'התקציב המתורגם לשקלים (חישוב אוטומטי)'))}</div><div class="v">${escapeHtml(researchData.convertedBudget || t('notSpecified', 'לא צוין'))}</div></div>
        </div>
        ${budgetTableHtml}
      </div>

      <div class="section">
        <h2>${escapeHtml(t('partnersProjectTitle', 'שותפים לפרוייקט'))}</h2>
        <div class="grid">${partnersHtml}</div>
      </div>

      <div class="section">
        <h2>${escapeHtml(t('researchDescriptionTitle', 'תיאור המחקר'))}</h2>
        <div class="grid">
          <div class="kv"><div class="k">${escapeHtml(t('abstractLabel', 'Abstract'))}</div><div class="v">${escapeHtml(researchData.abstract || '')}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('scientificBackgroundLabel', 'Scientific background'))}</div><div class="v">${escapeHtml(researchData.scientificBackground || '')}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('researchObjectivesLabel', 'Research objectives'))}</div><div class="v">${escapeHtml(researchData.researchObjectives || '')}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('detailedDescriptionLabel', 'Detailed description'))}</div><div class="v">${escapeHtml(researchData.detailedDescription || '')}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('significanceLabel', 'Significance'))}</div><div class="v">${escapeHtml(researchData.significanceInnovation || '')}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('applicabilityLabel', 'Applicability'))}</div><div class="v">${escapeHtml(researchData.applicability || '')}</div></div>
        </div>
      </div>

      <div class="section">
        <h2>${escapeHtml(t('additionalInfoTitle', 'מידע נוסף'))}</h2>
        <div class="grid">
          <div class="kv"><div class="k">${escapeHtml(t('expectedResponseDateLabel', 'תאריך משוער'))}</div><div class="v">${escapeHtml(formatDateForLocale(researchData.expectedResponseDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('notesFreeText', 'הערות'))}</div><div class="v">${escapeHtml(researchData.notes || '')}</div></div>
        </div>
      </div>

      ${researchData.digitalSignature?.signed
        ? `
          <div class="section">
            <h2>${escapeHtml(t('digitalSignatureTitle', 'חתימה דיגיטלית'))}</h2>
            <div class="grid">
              <div class="kv"><div class="k">${escapeHtml(t('signedBy', 'חתום על ידי'))}</div><div class="v">${escapeHtml(researchData.digitalSignature.signer || '')}</div></div>
              <div class="kv"><div class="k">${escapeHtml(t('signatureDate', 'תאריך חתימה'))}</div><div class="v">${escapeHtml(formatDateForLocale(researchData.digitalSignature.date))}</div></div>
            </div>
          </div>
        `
        : ''
      }

      ${workPlanTasksHtml
        ? `
          <div class="section">
            <h2>${escapeHtml(t('workPlan', 'תוכנית עבודה'))}</h2>
            ${workPlanTasksHtml}
          </div>
        `
        : ''
      }
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
            <p>טוען פרטי מחקר...</p>
          </div>
        )}

        {error && (
          <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && researchData && (
          <div style={{ direction: 'rtl', textAlign: 'right' }}>
            {/*
              Edit permissions:
              - Admin can always edit.
              - Researcher can edit only until proposal is approved (awarded).
            */}
            {(() => {
              const canEditResearch =
                isAdmin() || (userRole === 'RESEARCHER' && researchData.status !== 'awarded');
              return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, color: '#333' }}>פרטי מחקר</h1>
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
                    ✏️ ערוך מחקר
                  </button>
                )}
              </div>
            </div>
              );
            })()}

            <ResearchInfoSection researchData={researchData} />
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
                  אישור הצעת מחקר ומימון
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '16px',
                    alignItems: 'end',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>
                      סטטוס הצעה
                    </label>
                    <select
                      value={proposalStatus}
                      onChange={(e) => setProposalStatus(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                      <option value="pending">בהמתנה</option>
                      <option value="awarded">מאושר</option>
                      <option value="rejected">נדחה</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>
                      תקציב שהתקבל (₪)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={approvedBudgetInput}
                      readOnly
                      disabled
                      placeholder="מחושב אוטומטית מסכומי הרכיבים"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        background: '#f1f5f9',
                      }}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleSaveProposalDecision}
                      disabled={savingProposalDecision}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: savingProposalDecision ? '#94a3b8' : '#2b6cb0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: savingProposalDecision ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      {savingProposalDecision ? 'שומר...' : 'שמור החלטה'}
                    </button>
                  </div>
                </div>
                {Object.keys(researchData.budgetComponents || {}).length > 0 && (
                  <div style={{ marginTop: '18px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '6px', fontSize: '16px' }}>
                      רכיבי תקציב: מבוקש מול התקבל
                    </h3>
                    {isAdmin() && (
                      <p style={{
                        margin: '0 0 12px',
                        fontSize: '13px',
                      
                        borderRadius: '6px',
                        padding: '7px 12px'
                      }}>
                        עריכת רכיבי תקציב זמינה רק לאחר שינוי סטטוס ההצעה ל"הצעה מאושרת"
                      </p>
                    )}
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {Object.entries(researchData.budgetComponents || {}).map(([componentKey, requestedValue]) => (
                        <div
                          key={componentKey}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(150px, 1.5fr) minmax(120px, 1fr) minmax(140px, 1fr)',
                            gap: '10px',
                            alignItems: 'center',
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '10px',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', color: '#334155' }}>{componentKey}</div>
                          <div style={{ color: '#334155' }}>
                            מבוקש: {Number(requestedValue || 0).toLocaleString('he-IL')}
                          </div>
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
                            placeholder="התקבל"
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: proposalStatus === 'awarded' ? '#fff' : '#f8fafc',
                            }}
                            disabled={proposalStatus !== 'awarded'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <ResearchPeriodSection researchData={researchData} />
            <BudgetSection researchData={researchData} />
            <PartnersSection researchData={researchData} />
            <ResearchDescriptionSection researchData={researchData} />
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
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>פטנטים מקושרים</h2>
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
                        {patent.title || patent.projectTitle || 'ללא כותרת'}
                      </h3>
                      <p className="research-researcher" style={{ textAlign: 'center' }}>
                        {patent.researcherName || patent.researcher || 'חוקר'}
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
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>מאמרים מקושרים</h2>
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
                        {article.title || 'ללא כותרת'}
                      </h3>
                      <p className="research-researcher" style={{ textAlign: 'center' }}>
                        {article.journalName || article.researcherName || 'מאמר'}
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
                <h2 style={{ marginTop: 0, marginBottom: '12px', color: '#667eea' }}>משימות והגשות</h2>
                <p style={{ margin: 0, color: '#555', lineHeight: 1.6 }}>
                  ניתן לחלק משימות ולהגיש מסמכים רק לאחר שהמחקר מאושר (זכה).
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
