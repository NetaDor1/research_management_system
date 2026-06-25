import React, { useState, useEffect, useRef } from 'react';
import TaskForm from '../components/research/TaskForm';
import FileDropZone from '../components/FileDropZone';
import { canResearcherEditPatent, isDraft } from '../utils/submissionStatus';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, getDoc as getDocTask, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, storage } from '../services/firebase';
import { createNotification } from '../services/notifications';
import './Page.css';
import './Research.css';
import { exportPrintableHtmlToPdf, escapeHtml } from '../utils/exportPdf';
import { navigateBackOrFallback } from '../utils/navigation';
import PatentDisclosureDisplay from '../components/research/PatentDisclosureDisplay';

const PatentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, userRole, user } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const locale = language === 'en' ? 'en-US' : 'he-IL';
  const notSpecified = t('notSpecified', 'לא צוין');
  const [patentData, setPatentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkedResearch, setLinkedResearch] = useState(null);
  const [linkedResearchLoading, setLinkedResearchLoading] = useState(false);
  const [patentDecisionLoading, setPatentDecisionLoading] = useState(false);
  const [approvedStageBudgetsInput, setApprovedStageBudgetsInput] = useState({});
  const [approvedPatentBudgetInput, setApprovedPatentBudgetInput] = useState('');
  const [savingPatentBudget, setSavingPatentBudget] = useState(false);

  // Tasks and submissions state
  const [tasks, setTasks] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', files: [] });
  const [uploading, setUploading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTask, setEditTask] = useState({ title: '', description: '', dueDate: '', files: [], existingAttachments: [] });

  useEffect(() => {
    const fetchPatent = async () => {
      if (!db) {
        setError(t('dbNotInitialized', 'מסד הנתונים לא מאותחל'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const docRef = doc(db, 'patents', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if user has permission to view this patent
          if (userRole === 'RESEARCHER' && data.researcherId !== user?.id) {
            setError(t('noPermissionViewPatent', 'אין הרשאה לצפות בפטנט זה'));
            setLoading(false);
            return;
          }

          if (userRole === 'ADMIN' && isDraft(data)) {
            setError(t('draftNotVisibleToAdmin', 'טיוטה זו אינה זמינה לרשות המחקר עד להגשה'));
            setLoading(false);
            return;
          }

          setPatentData(data);
        } else {
          setError(t('patentNotFound', 'הפטנט לא נמצא'));
        }
      } catch (err) {
        console.error('Error fetching patent:', err);
        setError(t('loadPatentError', 'שגיאה בטעינת פרטי הפטנט'));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPatent();
    }
  }, [id, userRole, user?.id]);

  useEffect(() => {
    if (!db) return;

    const researchId = patentData?.researchProposalId;
    if (!researchId) {
      setLinkedResearch(null);
      return;
    }

    let isActive = true;
    setLinkedResearchLoading(true);

    const fetchLinkedResearch = async () => {
      try {
        const researchSnap = await getDoc(doc(db, 'researchProposals', researchId));
        if (!isActive) return;
        if (researchSnap.exists()) {
          const data = researchSnap.data();
          setLinkedResearch({
            id: researchId,
            title: data.projectTitle || data.title || t('noTitle', 'ללא כותרת')
          });
        } else {
          setLinkedResearch(null);
        }
      } catch (err) {
        console.error('Error fetching linked research:', err);
        if (isActive) {
          setLinkedResearch(null);
        }
      } finally {
        if (isActive) {
          setLinkedResearchLoading(false);
        }
      }
    };

    fetchLinkedResearch();
    return () => {
      isActive = false;
    };
  }, [db, patentData?.researchProposalId]);

  // Fetch tasks
  // Sync approved stage budgets from patentData (default to requested value)
  useEffect(() => {
    if (!patentData) return;
    const existing = patentData.approvedStageBudgets || {};
    const stages = patentData.stageBudgets || {};
    const next = {};
    Object.keys(stages).forEach(k => {
      const saved = existing[k];
      next[k] = saved !== undefined && saved !== null
        ? String(saved)
        : String(stages[k] ?? '');
    });
    setApprovedStageBudgetsInput(next);
  }, [patentData]);

  // Auto-calc total approved from stages
  useEffect(() => {
    const stages = patentData?.stageBudgets || {};
    const total = Object.keys(stages).reduce((sum, k) => {
      const n = parseFloat(String(approvedStageBudgetsInput[k] ?? '').replace(/,/g, '')) || 0;
      return sum + n;
    }, 0);
    setApprovedPatentBudgetInput(String(total));
  }, [approvedStageBudgetsInput, patentData]);

  useEffect(() => {
    if (!id || !db) return;

    const tasksRef = collection(db, 'patents', id, 'tasks');
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
        console.log('Tasks updated:', sortedTasks.length, 'tasks');
        setTasks(sortedTasks);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
        // Don't show alert for permission errors - might be normal if rules not set up yet
        if (error.code !== 'permission-denied') {
          console.error('Tasks fetch error:', error.message);
        }
      }
    );

    return () => unsubscribe();
  }, [id]);

  const formatDate = (timestamp) => {
    if (!timestamp) return notSpecified;
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString(locale);
      }
      if (timestamp && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString(locale);
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString(locale);
      }
      return String(timestamp);
    } catch (e) {
      return String(timestamp);
    }
  };

  const formatCurrency = (amount, currency = 'ILS') => {
    if (!amount) return notSpecified;
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
    return `${currencySymbol} ${Number(amount).toLocaleString(locale)}`;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'registered':
        return t('registered', 'רשום');
      case 'approved':
        return t('approved', 'אושר');
      case 'in-process':
        return t('inProcess', 'בהליך');
      case 'rejected':
        return t('rejected', 'נדחה');
      default:
        return status || notSpecified;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'registered':
        return 'status-awarded';
      case 'approved':
        return 'status-awarded';
      case 'in-process':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const getBackPath = () => (userRole === 'RESEARCHER' ? '/' : '/patents');

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

  // Handle adding a new task (admin only)
  const handleAddTask = async () => {
    if (!isAdmin() || !id || !db) return;

    if (!newTask.title.trim()) {
      alert(t('enterTaskTitleAlert', 'אנא הזן כותרת למשימה'));
      return;
    }

    setUploading(true);
    try {
      // Convert dueDate string to Timestamp if provided
      let dueDateTimestamp = null;
      if (newTask.dueDate) {
        try {
          dueDateTimestamp = Timestamp.fromDate(new Date(newTask.dueDate));
        } catch (e) {
          console.error('Error converting dueDate:', e);
        }
      }

      const researcherId = patentData?.researcherId || '';

      // Upload admin-attached files if any
      const attachments = [];
      if (newTask.files && newTask.files.length > 0) {
        for (const file of newTask.files) {
          const fileRef = ref(storage, `patents/${id}/tasks/attachments/${Date.now()}-${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          attachments.push({ name: file.name, url, uploadedAt: new Date().toISOString() });
        }
      }

      const taskData = {
        title: newTask.title,
        description: newTask.description || '',
        dueDate: dueDateTimestamp,
        createdAt: serverTimestamp(),
        createdBy: user?.name || 'Admin',
        researcherId,
        status: 'pending',
        submissions: [],
        attachments
      };

      const tasksRef = collection(db, 'patents', id, 'tasks');
      const taskDocRef = await addDoc(tasksRef, taskData);
      const taskId = taskDocRef.id;

      const dueDateLabel = newTask.dueDate
        ? new Date(newTask.dueDate).toLocaleDateString('he-IL')
        : '';

      await createTaskNotification({
        researcherId,
        title: 'משימה חדשה מהרשות',
        message: `נוספה משימה חדשה: "${newTask.title}"${dueDateLabel ? ` (תאריך יעד: ${dueDateLabel})` : ''}.`,
        taskId,
        link: `/patents/${id}`,
        eventKey: `patent_task_created:${taskId}`
      });

      setNewTask({ title: '', description: '', dueDate: '', files: [] });
      setShowAddTask(false);
      alert('המשימה נוספה בהצלחה!');
    } catch (err) {
      console.error('Error adding task:', err);
      console.error('Error details:', err.message);
      alert(`שגיאה בהוספת משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle file upload for task submission (researcher)
  const handleFileUpload = async (taskId, files, inputElement) => {
    if (!id || !taskId || !files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFiles = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Date.now();
        const fileRef = ref(storage, `patents/${id}/tasks/${taskId}/submissions/${timestamp}-${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadedFiles.push({
          name: file.name,
          url: url,
          uploadedAt: new Date().toISOString()
        });
      }

      // Update task with submission
      const taskRef = doc(db, 'patents', id, 'tasks', taskId);
      const taskDoc = await getDocTask(taskRef);
      const existingSubmissions = taskDoc.data()?.submissions || [];
      
      const updatedSubmissions = [...existingSubmissions, ...uploadedFiles];
      console.log('Updating task with submissions:', updatedSubmissions.length, 'files');
      
      await updateDoc(taskRef, {
        submissions: updatedSubmissions,
        status: 'submitted',
        submittedAt: serverTimestamp(),
        submittedBy: user?.name || 'Researcher'
      });

      console.log('Task updated successfully');

      // Reset the file input
      if (inputElement) {
        inputElement.value = '';
      }

      // The onSnapshot will automatically update the UI, but we show a success message
      alert('הקבצים הועלו בהצלחה! המשימה עודכנה לסטטוס "הוגשה".');
    } catch (err) {
      console.error('Error uploading files:', err);
      console.error('Error details:', err.message);
      alert(`שגיאה בהעלאת קבצים: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle editing a task (admin only)
  const handleEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditTask({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate().toISOString().split('T')[0] : '') : '',
      files: [],
      existingAttachments: task.attachments || []
    });
  };

  // Handle saving edited task (admin only)
  const handleSaveEditTask = async (formData) => {
    if (!isAdmin() || !id || !db || !editingTaskId) return;

    setUploading(true);
    try {
      let dueDateTimestamp = null;
      if (formData.dueDate) {
        try {
          dueDateTimestamp = Timestamp.fromDate(new Date(formData.dueDate));
        } catch (e) {
          console.error('Error converting dueDate:', e);
        }
      }

      const taskRef = doc(db, 'patents', id, 'tasks', editingTaskId);
      const taskSnap = await getDoc(taskRef);
      const existingTask = taskSnap.exists() ? taskSnap.data() : null;
      const researcherId = existingTask?.researcherId || patentData?.researcherId || '';

      const keptAttachments = formData.existingAttachments || [];
      const newAttachments = [];
      if (formData.files && formData.files.length > 0) {
        for (const file of formData.files) {
          const fileRef = ref(storage, `patents/${id}/tasks/attachments/${Date.now()}-${file.name}`);
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

      const dueDateLabel = formData.dueDate
        ? new Date(formData.dueDate).toLocaleDateString('he-IL')
        : '';

      await createTaskNotification({
        researcherId,
        title: 'עדכון משימה מהרשות',
        message: dueDateLabel
          ? `תאריך הגשת "${formData.title}" עודכן ל-"${dueDateLabel}".`
          : `המשימה "${formData.title}" עודכנה.`,
        taskId: editingTaskId,
        link: `/patents/${id}`,
        eventKey: `patent_task_updated:${editingTaskId}:${Date.now()}`
      });

      setEditingTaskId(null);
      setEditTask({ title: '', description: '', dueDate: '', files: [], existingAttachments: [] });
      alert('המשימה עודכנה בהצלחה!');
    } catch (err) {
      console.error('Error updating task:', err);
      console.error('Error details:', err.message);
      alert(`שגיאה בעדכון משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle deleting a task (admin only)
  const handleDeleteTask = async (taskId) => {
    if (!isAdmin() || !id || !db || !taskId) return;

    if (!window.confirm(t('confirmDeleteTask', 'האם אתה בטוח שברצונך למחוק את המשימה הזו?'))) {
      return;
    }

    setUploading(true);
    try {
      const taskRef = doc(db, 'patents', id, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      const existingTask = taskSnap.exists() ? taskSnap.data() : null;
      const researcherId = existingTask?.researcherId || patentData?.researcherId || '';
      const taskTitle = existingTask?.title || 'משימה';

      await deleteDoc(taskRef);

      await createTaskNotification({
        researcherId,
        title: 'משימה נמחקה מהרשות',
        message: `המשימה "${taskTitle}" נמחקה על ידי הרשות.`,
        taskId,
        link: `/patents/${id}`,
        eventKey: `patent_task_deleted:${taskId}`,
        type: 'task_deleted'
      });
      alert('המשימה נמחקה בהצלחה!');
    } catch (err) {
      console.error('Error deleting task:', err);
      console.error('Error details:', err.message);
      alert(`שגיאה במחיקת משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

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

  const handlePatentDecision = async (newStatus) => {
    if (!isAdmin() || !id || !db || !patentData) return;
    const label = newStatus === 'approved' ? 'לאשר' : 'לדחות';
    if (!window.confirm(`האם אתה בטוח שברצונך ${label} את הפטנט הזה?`)) return;

    setPatentDecisionLoading(true);
    try {
      await updateDoc(doc(db, 'patents', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      if (patentData.researcherId) {
        const notifTitle = newStatus === 'approved' ? 'הפטנט אושר' : 'הפטנט נדחה';
        const notifMsg = newStatus === 'approved'
          ? `הפטנט "${patentData.projectTitle || patentData.title || ''}" אושר.`
          : `הפטנט "${patentData.projectTitle || patentData.title || ''}" נדחה.`;
        await createNotification({
          userId: patentData.researcherId,
          title: notifTitle,
          message: notifMsg,
          type: 'patent_status',
          entityType: 'patent',
          entityId: id,
          link: `/patents/${id}`,
          eventKey: `patent_status:${id}:${newStatus}:${Date.now()}`,
        });
      }

      setPatentData((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating patent status:', err);
      alert(`שגיאה בעדכון הסטטוס: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setPatentDecisionLoading(false);
    }
  };

  const handleSavePatentBudget = async () => {
    if (!isAdmin() || !id || !db || !patentData) return;
    const stages = patentData.stageBudgets || {};
    const approvedPayload = {};
    let total = 0;
    for (const k of Object.keys(stages)) {
      const raw = parseFloat(String(approvedStageBudgetsInput[k] ?? '').replace(/,/g, '')) || 0;
      approvedPayload[k] = raw;
      total += raw;
    }
    setSavingPatentBudget(true);
    try {
      await updateDoc(doc(db, 'patents', id), {
        approvedStageBudgets: approvedPayload,
        approvedBudget: total,
        updatedAt: serverTimestamp(),
      });
      setPatentData(prev => ({ ...prev, approvedStageBudgets: approvedPayload, approvedBudget: total }));
      alert(t('patentBudgetSaved', 'תקציב הפטנט עודכן בהצלחה'));
    } catch (err) {
      alert(`שגיאה: ${err.message}`);
    } finally {
      setSavingPatentBudget(false);
    }
  };

  const handleExportPDF = () => {
    if (!patentData) return;

    const titleValue = patentData.projectTitle || patentData.title || t('notSpecified', 'לא צוין');
    const pdfTitle = `${t('patentDetailsTitle', 'פרטי פטנט')} - ${titleValue}`;
    const dir = language === 'en' ? 'ltr' : 'rtl';
    const lang = language === 'en' ? 'en' : 'he';

    const percentageLabel = t('percentage', 'אחוז');
    const institutionPctLabel = t('patentInstitutionPercentage', 'אחוז המוסד');
    const patentStageLabel = t('patentStage', 'שלב הפטנט');
    const commercializationUnitTitle = t('commercializationUnit', 'יחידת מסחור');
    const contact1Label = t('contact1', 'איש קשר 1');
    const email1Label = t('email1', 'אימייל 1');
    const contact2Label = t('contact2', 'איש קשר 2');
    const email2Label = t('email2', 'אימייל 2');
    const datesTitle = t('datesTitle', 'תאריכים');
    const dateLabelSubmission = t('patentDateSubmission', 'תאריך הגשת הבקשה');
    const dateLabelInitialReview = t('patentDateInitialReview', 'תאריך בדיקה ראשונית');
    const dateLabelExamination = t('patentDateExamination', 'תאריך בחינה');
    const dateLabelApproval = t('patentDateApproval', 'תאריך אישור');
    const dateLabelRegistration = t('patentDateRegistration', 'תאריך רישום');
    const dateLabelPublication = t('patentDatePublication', 'תאריך פרסום');
    const dateLabelRenewal = t('patentDateRenewal', 'תאריך חידוש');
    const dateLabelExpiry = t('patentDateExpiry', 'תאריך תפוגה');

    const partners = Array.isArray(patentData.partners) ? patentData.partners : [];
    const stageBudgets = patentData.stageBudgets || {};

    const partnersHtml = partners.length
      ? partners
          .map((p, idx) => {
            const name = p.name || t('notSpecified', 'לא צוין');
            const email = p.email || t('notSpecified', 'לא צוין');
            const institution = p.institution || t('notSpecified', 'לא צוין');
            const percentage = p.percentage || '';
            return `
              <div class="kv">
                <div class="k">${escapeHtml(`${t('partner', 'שותף')} ${idx + 1}`)}</div>
                <div class="v">
                  ${escapeHtml(`${t('partnerName', 'שם השותף')}: ${name}`)}<br/>
                  ${escapeHtml(`${t('partnerEmail', 'אימייל של השותף')}: ${email}`)}<br/>
                  ${escapeHtml(`${t('partnerInstitution', 'המוסד של השותף')}: ${institution}`)}
                  ${percentage ? `<br/>${escapeHtml(`${percentageLabel}: ${percentage}`)}` : ''}
                </div>
              </div>
            `;
          })
          .join('')
      : `<div class="muted">${escapeHtml(t('notSpecified', 'לא צוין'))}</div>`;

    const stageBudgetRowsHtml = Object.entries(stageBudgets)
      .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
      .join('');

    const stageBudgetTableHtml = stageBudgetRowsHtml
      ? `
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(t('stageBudget', 'תקציב לפי שלבים'))}</th>
              <th>${escapeHtml(t('amount', 'כמות'))}</th>
            </tr>
          </thead>
          <tbody>
            ${stageBudgetRowsHtml}
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
          <div class="kv"><div class="k">${escapeHtml(institutionPctLabel)}</div><div class="v">${escapeHtml(patentData.institutionPercentage || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('submissionPathLabel', 'מסלול ההגשה לקרן'))}</div><div class="v">${escapeHtml(patentData.submissionPath || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('researcherRoleLabel', 'תפקיד החוקר בהצעת המחקר'))}</div><div class="v">${escapeHtml(patentData.researcherRole || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('researcher', 'חוקר'))}</div><div class="v">${escapeHtml(patentData.researcherName || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('status', 'סטטוס'))}</div><div class="v">${escapeHtml(patentData.status || '')}</div></div>
          <div class="kv"><div class="k">${escapeHtml(patentStageLabel)}</div><div class="v">${escapeHtml(patentData.patentStage || t('notSpecified', 'לא צוין'))}</div></div>
        </div>
      </div>

      <div class="section">
        <h2>${escapeHtml(commercializationUnitTitle)}</h2>
        <div class="grid">
          <div class="kv"><div class="k">${escapeHtml(commercializationUnitTitle)}</div><div class="v">${escapeHtml(patentData.commercializationUnit || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(contact1Label)}</div><div class="v">${escapeHtml(patentData.commercializationContact1 || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(email1Label)}</div><div class="v">${escapeHtml(patentData.commercializationEmail1 || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(contact2Label)}</div><div class="v">${escapeHtml(patentData.commercializationContact2 || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(email2Label)}</div><div class="v">${escapeHtml(patentData.commercializationEmail2 || t('notSpecified', 'לא צוין'))}</div></div>
        </div>
      </div>

      <div class="section">
        <h2>${escapeHtml(datesTitle)}</h2>
        <div class="grid">
          <div class="kv"><div class="k">${escapeHtml(dateLabelSubmission)}</div><div class="v">${escapeHtml(formatDateForLocale(patentData.submissionDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(dateLabelInitialReview)}</div><div class="v">${escapeHtml(formatDateForLocale(patentData.initialReviewDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(dateLabelExamination)}</div><div class="v">${escapeHtml(formatDateForLocale(patentData.examinationDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(dateLabelApproval)}</div><div class="v">${escapeHtml(formatDateForLocale(patentData.approvalDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(dateLabelRegistration)}</div><div class="v">${escapeHtml(formatDateForLocale(patentData.registrationDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(dateLabelPublication)}</div><div class="v">${escapeHtml(formatDateForLocale(patentData.publicationDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(dateLabelRenewal)}</div><div class="v">${escapeHtml(formatDateForLocale(patentData.renewalDate))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(dateLabelExpiry)}</div><div class="v">${escapeHtml(formatDateForLocale(patentData.expiryDate))}</div></div>
        </div>
      </div>

      <div class="section">
        <h2>${escapeHtml(t('budgetTitle', 'תקציב'))}</h2>
        <div class="grid">
          <div class="kv"><div class="k">${escapeHtml(t('totalBudgetRequested', 'סה"כ התקציב המבוקש (חישוב אוטומטי)'))}</div><div class="v">${escapeHtml(patentData.totalBudget || t('notSpecified', 'לא צוין'))}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('budgetCurrency', 'מטבע התקציב'))}</div><div class="v">${escapeHtml(patentData.currency || 'ILS')}</div></div>
          <div class="kv"><div class="k">${escapeHtml(t('budgetConvertedIls', 'התקציב המתורגם לשקלים (חישוב אוטומטי)'))}</div><div class="v">${escapeHtml(patentData.convertedBudget || t('notSpecified', 'לא צוין'))}</div></div>
        </div>
        ${stageBudgetTableHtml}
      </div>

      <div class="section">
        <h2>${escapeHtml(t('partnersProjectTitle', 'שותפים לפרוייקט'))}</h2>
        <div class="grid">${partnersHtml}</div>
      </div>

      ${patentData.notes ? `
        <div class="section">
          <h2>${escapeHtml(t('notesFreeText', 'הערות'))}</h2>
          <div class="kv">
            <div class="v">${escapeHtml(patentData.notes)}</div>
          </div>
        </div>
      ` : ''}

      <div class="muted" style="margin-top: 20px; font-size: 12px;">
        ${escapeHtml(language === 'en' ? `Generated on ${new Date().toLocaleString('en-US')}` : `נוצר ב-${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL')}`)}
      </div>
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
            <p>{t('loadingPatentDetails', 'טוען פרטי פטנט...')}</p>
          </div>
        )}

        {error && (
          <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && patentData && (
          <div style={{ textAlign }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, color: '#333' }}>{t('patentDetailsTitle', 'פרטי פטנט')}</h1>
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
                {(isAdmin() || (userRole === 'RESEARCHER' && canResearcherEditPatent(patentData))) && (
                  <button
                    onClick={() => {
                      navigate(`/patents/new?edit=${id}`);
                    }}
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
                    ✏️ {t('editPatent', 'ערוך פטנט')}
                  </button>
                )}
              </div>
            </div>

            {/* פרטים כלליים */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>{t('generalDetails', 'פרטים כלליים')}</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('projectTitleShort', 'כותרת הפרויקט')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.projectTitle || patentData.title || notSpecified}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('patentInstitutionPercentage', 'אחוז המוסד')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.institutionPercentage || notSpecified}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('submissionPathShort', 'מסלול הגשה')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.submissionPath || notSpecified}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('researcherRoleShort', 'תפקיד החוקר')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.researcherRole || notSpecified}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('linkedResearch', 'מחקר מקושר')}:
                  </label>
                  {patentData.researchProposalId ? (
                    linkedResearchLoading ? (
                      <span style={{ fontSize: '16px' }}>{t('loadingShort', 'טוען...')}</span>
                    ) : linkedResearch ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/research/${linkedResearch.id}`)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          color: '#667eea',
                          cursor: 'pointer',
                          fontSize: '16px',
                          textDecoration: 'underline'
                        }}
                      >
                        {linkedResearch.title}
                      </button>
                    ) : (
                      <span style={{ fontSize: '16px' }}>{t('linkedNotFound', 'לא נמצא')}</span>
                    )
                  ) : (
                    <span style={{ fontSize: '16px' }}>{t('notLinked', 'לא מקושר')}</span>
                  )}
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('researcher', 'חוקר')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.researcherName || notSpecified}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('status', 'סטטוס')}:
                  </label>
                  <span 
                    className={`status-button ${getStatusClass(patentData.status)}`}
                    style={{ 
                      display: 'inline-block',
                      padding: '5px 15px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      width: 'fit-content',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {getStatusLabel(patentData.status)}
                  </span>
                  {isAdmin() && patentData.status === 'in-process' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        type="button"
                        disabled={patentDecisionLoading}
                        onClick={() => handlePatentDecision('approved')}
                        style={{
                          padding: '5px 12px',
                          background: 'transparent',
                          color: patentDecisionLoading ? '#aaa' : '#3d8c5c',
                          border: `1px solid ${patentDecisionLoading ? '#aaa' : '#3d8c5c'}`,
                          borderRadius: '6px',
                          cursor: patentDecisionLoading ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        ✔ {t('approvePatent', 'אשר')}
                      </button>
                      <button
                        type="button"
                        disabled={patentDecisionLoading}
                        onClick={() => handlePatentDecision('rejected')}
                        style={{
                          padding: '5px 12px',
                          background: 'transparent',
                          color: patentDecisionLoading ? '#aaa' : '#b84f5a',
                          border: `1px solid ${patentDecisionLoading ? '#aaa' : '#b84f5a'}`,
                          borderRadius: '6px',
                          cursor: patentDecisionLoading ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        ✖ {t('rejectPatent', 'דחה')}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('patentStage', 'שלב הפטנט')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.patentStage || notSpecified}</span>
                </div>
              </div>
            </div>

            <PatentDisclosureDisplay
              patentData={patentData}
              t={t}
              formatDate={formatDate}
              notSpecified={notSpecified}
            />

            {/* יחידת מסחור */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>{t('commercializationUnit', 'יחידת מסחור')}</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('commercializationUnit', 'יחידת מסחור')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationUnit || notSpecified}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('contact1', 'איש קשר 1')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationContact1 || notSpecified}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('email1', 'אימייל 1')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationEmail1 || notSpecified}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('contact2', 'איש קשר 2')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationContact2 || notSpecified}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('email2', 'אימייל 2')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationEmail2 || notSpecified}
                  </span>
                </div>
              </div>
            </div>

            {/* תאריכים */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>{t('datesTitle', 'תאריכים')}</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('patentDateSubmission', 'תאריך הגשת הבקשה')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.submissionDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('patentDateInitialReview', 'תאריך בדיקה ראשונית')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.initialReviewDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('patentDateExamination', 'תאריך בחינה')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.examinationDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('patentDateApproval', 'תאריך אישור')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.approvalDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('patentDateRegistration', 'תאריך רישום')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.registrationDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('patentDatePublication', 'תאריך פרסום')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.publicationDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('patentDateRenewal', 'תאריך חידוש')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.renewalDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('patentDateExpiry', 'תאריך תפוגה')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.expiryDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* תקציב */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>{t('budgetTitle', 'תקציב')}</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('totalBudget', 'תקציב כולל')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatCurrency(patentData.totalBudget, patentData.currency)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('currency', 'מטבע')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.currency || 'ILS'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    {t('convertedBudget', 'תקציב מומר')}:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatCurrency(patentData.convertedBudget, 'ILS')}
                  </span>
                </div>
              </div>

              {(() => {
                const cur = patentData.currency || 'ILS';
                const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : '₪';
                const rate = cur === 'USD' ? 3.5 : cur === 'EUR' ? 3.8 : 1;
                const showILSCol = cur !== 'ILS';
                const toILS = (v) => v ? `₪ ${(Number(v) * rate).toLocaleString(locale, { style: 'decimal' })}` : '—';
                const notSpec = t('notSpecified', 'לא צוין');
                const approvedStages = patentData.approvedStageBudgets || {};
                const stages = patentData.stageBudgets || {};
                const stageEntries = Object.entries(stages);
                return (
                  <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                    <h3 style={{ marginBottom: '10px', color: '#666' }}>{t('stageBudgetByStage', 'תקציב לפי שלבים: מבוקש / התקבל')}:</h3>
                    {stageEntries.length === 0 ? (
                      <p style={{ color: '#999', fontStyle: 'italic' }}>{t('noStageBudgets', 'לא הוגשו שלבי תקציב')}</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign, padding: '10px', borderBottom: '1px solid #ddd' }}>{t('stage', 'שלב')}</th>
                            <th style={{ textAlign, padding: '10px', borderBottom: '1px solid #ddd' }}>{t('requested', 'מבוקש')}</th>
                            {showILSCol && <th style={{ textAlign, padding: '10px', borderBottom: '1px solid #ddd', color: '#2b6cb0', fontSize: '13px' }}>{t('convertedILS', 'המרה לשקלים')}</th>}
                            <th style={{ textAlign, padding: '10px', borderBottom: '1px solid #ddd' }}>{t('received', 'התקבל')}</th>
                            {showILSCol && <th style={{ textAlign, padding: '10px', borderBottom: '1px solid #ddd', color: '#2b6cb0', fontSize: '13px' }}>{t('convertedILS', 'המרה לשקלים')}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {stageEntries.map(([key, value]) => {
                            const approved = approvedStages[key];
                            const hasApproved = approved !== undefined && approved !== null;
                            return (
                              <tr key={key}>
                                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#475569' }}>{key}</td>
                                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                                  {`${sym} ${Number(value || 0).toLocaleString(locale, { style: 'decimal' })}`}
                                </td>
                                {showILSCol && <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#2b6cb0', fontSize: '14px' }}>{toILS(value)}</td>}
                                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                                  {hasApproved ? `${sym} ${Number(approved).toLocaleString(locale, { style: 'decimal' })}` : notSpec}
                                </td>
                                {showILSCol && <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#2b6cb0', fontSize: '14px' }}>{hasApproved ? toILS(approved) : '—'}</td>}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* אישור תקציב פטנט - רשות בלבד */}
            {isAdmin() && (
              <div style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#667eea' }}>
                  {t('patentBudgetApprovalTitle', 'אישור תקציב פטנט')}
                </h2>
                {(() => {
                  const currency = patentData.currency || 'ILS';
                  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
                  const rate = currency === 'USD' ? 3.5 : currency === 'EUR' ? 3.8 : 1;
                  const showILS = currency !== 'ILS';
                  const approvedRaw = parseFloat(approvedPatentBudgetInput) || 0;
                  const approvedILS = approvedRaw * rate;
                  const cols = showILS ? '1fr 1fr 1fr auto' : '1fr 1fr auto';
                  const stages = patentData.stageBudgets || {};
                  const hasStages = Object.keys(stages).length > 0;
                  const stageCols = showILS ? '1fr 170px 120px 1fr' : '1fr 170px 140px';
                  return (
                    <>
                      {/* שורת סיכום */}
                      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '16px', alignItems: 'end', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>
                            {t('approvedBudgetLabel', 'תקציב שהתקבל')} ({sym})
                          </label>
                          <input type="text" dir="ltr" readOnly disabled
                            value={approvedRaw > 0 ? `${sym} ${approvedRaw.toLocaleString(locale, { style: 'decimal' })}` : ''}
                            placeholder={t('autoCalculatedFromComponents', 'מחושב אוטומטית')}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: '#f1f5f9', boxSizing: 'border-box' }}
                          />
                          {showILS && <span style={{ display: 'block', height: '17px' }} />}
                        </div>
                        {showILS && (
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>
                              {t('approvedBudgetConvertedILS', 'מומר לשקלים (₪)')}
                            </label>
                            <input type="text" dir="ltr" readOnly disabled
                              value={approvedRaw > 0 ? `₪ ${approvedILS.toLocaleString(locale, { style: 'decimal' })}` : ''}
                              placeholder={t('autoCalculatedFromComponents', 'מחושב אוטומטית')}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: '#f1f5f9', color: '#2b6cb0', boxSizing: 'border-box' }}
                            />
                            <span style={{ fontSize: '11px', color: '#888', marginTop: '3px', display: 'block' }}>
                              1 {currency} = {rate} ₪
                            </span>
                          </div>
                        )}
                        <div>
                          <button type="button" onClick={handleSavePatentBudget} disabled={savingPatentBudget}
                            style={{ width: '100%', padding: '10px 14px', background: savingPatentBudget ? '#94a3b8' : '#2b6cb0', color: 'white', border: 'none', borderRadius: '6px', cursor: savingPatentBudget ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                            {savingPatentBudget ? t('saving', 'שומר...') : t('saveDecision', 'שמור החלטה')}
                          </button>
                          {showILS && <span style={{ display: 'block', height: '17px' }} />}
                        </div>
                      </div>
                      {/* טבלת שלבים */}
                      <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>
                        {t('stageBudgetRequestedVsApproved', 'תקציב לפי שלבים: מבוקש מול התקבל')}
                      </h3>
                      {!hasStages ? (
                        <p style={{ color: '#888', fontSize: '14px' }}>{t('noStageBudgets', 'לא הוגש תקציב לפי שלבים')}</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: stageCols, columnGap: '14px', rowGap: 0, alignItems: 'center' }}>
                          <div style={{ fontWeight: 'bold', color: '#888', fontSize: '12px', padding: '4px 10px', borderBottom: '1px solid #e2e8f0' }}>{t('stage', 'שלב')}</div>
                          <div style={{ fontWeight: 'bold', color: '#888', fontSize: '12px', padding: '4px 10px', borderBottom: '1px solid #e2e8f0' }}>{t('requested', 'מבוקש')}</div>
                          <div style={{ fontWeight: 'bold', color: '#888', fontSize: '12px', padding: '4px 10px', borderBottom: '1px solid #e2e8f0' }}>{t('received', 'התקבל')} ({sym})</div>
                          {showILS && <div style={{ fontWeight: 'bold', color: '#888', fontSize: '12px', padding: '4px 10px', borderBottom: '1px solid #e2e8f0' }}>{t('convertedILS', 'המרה לשקלים')}</div>}
                          {Object.entries(stages).map(([stageKey, requestedVal]) => {
                            const approvedVal = parseFloat(String(approvedStageBudgetsInput[stageKey] ?? '').replace(/,/g, '')) || 0;
                            const convertedVal = approvedVal * rate;
                            const rowBg = { background: '#fff', padding: '8px 10px', borderBottom: '1px solid #f0f0f0' };
                            return (
                              <React.Fragment key={stageKey}>
                                <div style={{ ...rowBg, fontWeight: 'bold', color: '#334155', fontSize: '14px' }}>{stageKey}</div>
                                <div style={{ ...rowBg, color: '#334155', fontSize: '14px' }}>
                                  {`${sym} ${Number(requestedVal || 0).toLocaleString(locale, { style: 'decimal' })}`}
                                </div>
                                <div style={{ ...rowBg }}>
                                  <input type="number" min="0" step="1"
                                    value={approvedStageBudgetsInput[stageKey] ?? ''}
                                    onChange={e => setApprovedStageBudgetsInput(prev => ({ ...prev, [stageKey]: e.target.value }))}
                                    placeholder="0"
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                                  />
                                </div>
                                {showILS && (
                                  <div style={{ ...rowBg, color: '#2b6cb0', fontSize: '14px' }}>
                                    {approvedVal > 0 ? `₪ ${convertedVal.toLocaleString(locale, { style: 'decimal' })}` : '—'}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* שותפים */}
            {patentData.partners && patentData.partners.length > 0 && (
              <div style={{ 
                background: '#f9f9f9', 
                padding: '30px', 
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>{t('partners', 'שותפים')}</h2>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {patentData.partners.map((partner, index) => (
                    <div key={index} style={{
                      padding: '20px',
                      background: '#fff',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>{t('name', 'שם')}:</label>
                        <span>{partner.name || notSpecified}</span>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>{t('email', 'אימייל')}:</label>
                        <span>{partner.email || notSpecified}</span>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>{t('institution', 'מוסד')}:</label>
                        <span>{partner.institution || notSpecified}</span>
                      </div>
                      {partner.percentage && (
                        <div>
                          <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>{t('percentage', 'אחוז')}:</label>
                          <span>{partner.percentage}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* הערות */}
            {patentData.notes && (
              <div style={{ 
                background: '#f9f9f9', 
                padding: '30px', 
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>{t('notesFreeText', 'הערות')}</h2>
                <p style={{ fontSize: '16px', lineHeight: '1.6' }}>{patentData.notes}</p>
              </div>
            )}

            {/* משימות והגשות */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#667eea' }}>{t('tasksAndSubmissions', 'משימות והגשות')}</h2>
                {isAdmin() && (
                  <button
                    onClick={() => setShowAddTask(!showAddTask)}
                    style={{
                      padding: '10px 20px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {showAddTask ? `✖️ ${t('cancelAddTask', 'ביטול')}` : `➕ ${t('addTaskButton', 'הוסף משימה')}`}
                  </button>
                )}
              </div>

              {/* Form to add new task (admin only) */}
              {isAdmin() && showAddTask && (
                <div style={{
                  background: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '2px solid #667eea'
                }}>
                  <h3 style={{ marginBottom: '15px' }}>{t('addNewTaskTitle', 'הוספת משימה חדשה')}</h3>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      {t('taskTitle', 'כותרת המשימה')}: *
                    </label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '16px'
                      }}
                      placeholder={t('enterTaskTitle', 'הזן כותרת למשימה')}
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      {t('description', 'תיאור')}:
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '16px',
                        minHeight: '100px',
                        resize: 'vertical'
                      }}
                      placeholder={t('enterTaskDescription', 'הזן תיאור למשימה')}
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      {t('dueDate', 'תאריך יעד')}:
                    </label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      {t('attachedFiles', 'קבצים מצורפים')}:
                    </label>
                    <FileDropZone
                      variant="compact"
                      disabled={uploading}
                      label={t('addFiles', 'הוסף קבצים')}
                      onFiles={(selected) => {
                        setNewTask(prev => ({ ...prev, files: [...(prev.files || []), ...selected] }));
                      }}
                    />
                    {(newTask.files || []).length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(newTask.files || []).map((file, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
                            <span style={{ fontSize: '13px', color: '#444' }}>📄 {file.name}</span>
                            <button
                              type="button"
                              onClick={() => setNewTask(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))}
                              style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              {t('remove', 'הסר')}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleAddTask}
                    disabled={uploading || !newTask.title.trim()}
                    style={{
                      padding: '10px 20px',
                      background: uploading ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    {uploading ? t('saving', 'שומר...') : t('saveTask', 'שמור משימה')}
                  </button>
                </div>
              )}

              {/* Tasks list */}
              {tasks.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  {isAdmin() ? t('noTasksAdmin', 'אין משימות. הוסף משימה חדשה.') : t('noTasksResearcher', 'אין משימות להצגה.')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        background: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                      }}
                    >
                      {editingTaskId === task.id ? (
                        <TaskForm
                          task={task}
                          onSave={handleSaveEditTask}
                          onCancel={() => {
                            setEditingTaskId(null);
                            setEditTask({ title: '', description: '', dueDate: '', files: [], existingAttachments: [] });
                          }}
                          loading={uploading}
                        />
                      ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <>
                            <h3 style={{ margin: 0, marginBottom: '5px', color: '#333' }}>{task.title}</h3>
                            {task.description && (
                              <p style={{ margin: '5px 0', color: '#666' }}>{task.description}</p>
                            )}
                            <div style={{ fontSize: '14px', color: '#888', marginTop: '10px' }}>
                              <span>{t('taskCreated', 'נוצרה')}: {formatDate(task.createdAt)}</span>
                              {task.dueDate && (
                                <span style={{ marginRight: '15px' }}> | {t('dueDate', 'תאריך יעד')}: {formatDate(task.dueDate)}</span>
                              )}
                              {task.status === 'submitted' && task.submittedAt && (
                                <span style={{ marginRight: '15px' }}> | {t('taskSubmitted', 'הוגשה')}: {formatDate(task.submittedAt)}</span>
                              )}
                            </div>

                            {task.attachments && task.attachments.length > 0 && (
                              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {task.attachments.map((file, idx) => (
                                  <a
                                    key={idx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '13px', color: '#667eea', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    📎 {file.name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                          <span
                            className={`status-button ${task.status === 'submitted' ? 'status-awarded' : 'status-pending'}`}
                            style={{
                              padding: '5px 15px',
                              borderRadius: '4px',
                              fontSize: '14px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {task.status === 'submitted' ? t('taskStatusSubmitted', 'הוגשה') : t('taskStatusPending', 'ממתינה')}
                          </span>
                          {isAdmin() && (
                            <div style={{ display: 'flex', gap: '3px', opacity: 0.5, transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}>
                              <button
                                onClick={() => handleEditTask(task)}
                                disabled={uploading}
                                style={{
                                  padding: '4px 8px',
                                  background: 'transparent',
                                  color: '#667eea',
                                  border: '1px solid #e0e0e0',
                                  borderRadius: '4px',
                                  cursor: uploading ? 'not-allowed' : 'pointer',
                                  fontSize: '14px',
                                  opacity: uploading ? 0.5 : 1
                                }}
                                title={t('editTask', 'ערוך משימה')}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={uploading}
                                style={{
                                  padding: '4px 8px',
                                  background: 'transparent',
                                  color: '#999',
                                  border: '1px solid #e0e0e0',
                                  borderRadius: '4px',
                                  cursor: uploading ? 'not-allowed' : 'pointer',
                                  fontSize: '14px',
                                  opacity: uploading ? 0.5 : 1
                                }}
                                title={t('deleteTask', 'מחק משימה')}
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      )}

                      {/* File upload for researcher */}
                      {!isAdmin() && task.status === 'pending' && (
                        <div style={{ marginTop: '15px', padding: '15px', background: '#f0f0f0', borderRadius: '4px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                            {t('uploadFilesForSubmissionShort', 'העלה קבצים להגשה')}:
                          </label>
                          <FileDropZone
                            disabled={uploading}
                            onFiles={async (files) => {
                              await handleFileUpload(task.id, files);
                            }}
                          />
                          {uploading && (
                            <div style={{ marginTop: '10px' }}>
                              <p style={{ color: '#667eea', fontWeight: 'bold' }}>{t('uploadingFiles', 'מעלה קבצים...')}</p>
                              <div style={{ 
                                width: '100%', 
                                height: '4px', 
                                background: '#e0e0e0', 
                                borderRadius: '2px',
                                marginTop: '5px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: '100%',
                                  height: '100%',
                                  background: '#667eea',
                                  animation: 'pulse 1.5s ease-in-out infinite'
                                }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show submitted files (both admin and researcher) */}
                      {task.submissions && task.submissions.length > 0 && (
                        <div style={{ marginTop: '15px', padding: '15px', background: '#e8f5e9', borderRadius: '4px' }}>
                          <h4 style={{ margin: 0, marginBottom: '10px', color: '#2e7d32' }}>{t('submittedFiles', 'קבצים שהוגשו')}:</h4>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {task.submissions.map((file, idx) => (
                              <li key={idx} style={{ marginBottom: '8px' }}>
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: '#667eea',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  📄 {file.name}
                                </a>
                                {file.uploadedAt && (
                                  <span style={{ marginRight: '10px', fontSize: '12px', color: '#666' }}>
                                    ({formatDate(file.uploadedAt)})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatentDetail;
