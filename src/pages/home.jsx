import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, onSnapshot, collectionGroup, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../services/firebase';
import { createNotification } from '../services/notifications';
import TasksCalendarContainer from '../components/TasksCalendarContainer';
import UpcomingTasks from '../components/UpcomingTasks';
import LimitedCardGrid from '../components/LimitedCardGrid';
import { shouldShowNewBadge } from '../utils/newBadge';
import { getPatentStatusLabel, getPatentStatusClass, normalizePatentStatus, PATENT_STATUS_PROVISIONAL } from '../utils/patentStatuses';
import './Page.css';
import './Research.css';

const Home = () => {
  const { isAdmin, user, userRole } = useAuth();
  const { t, isRTL } = useLanguage();
  const sectionTitleStyle = {
    marginBottom: '20px',
    textAlign: isRTL ? 'right' : 'left',
    borderBottom: '3px solid rgb(188, 192, 203)',
    paddingBottom: '10px',
    fontWeight: 'bold',
    color: '#2d3748',
  };
  const navigate = useNavigate();

  // Research state
  const [researchData, setResearchData] = useState([]);
  const [researchLoading, setResearchLoading] = useState(true);
  const [researchError, setResearchError] = useState('');

  // Patents state
  const [patentsData, setPatentsData] = useState([]);
  const [patentsLoading, setPatentsLoading] = useState(true);
  const [patentsError, setPatentsError] = useState('');

  // Articles state
  const [articlesData, setArticlesData] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState('');

  // Helper function to convert Firestore Timestamp to date string
  const toDateString = (timestamp) => {
    if (!timestamp) return '';
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString().split('T')[0];
    }
    if (timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toISOString().split('T')[0];
    }
    return String(timestamp);
  };

  // Fetch research data
  const fetchResearch = React.useCallback(async () => {
    if (!db || userRole !== 'RESEARCHER' || !user?.id) {
      setResearchLoading(false);
      return;
    }

    setResearchLoading(true);
    setResearchError('');
    
    try {
      const researchRef = collection(db, 'researchProposals');
      let querySnapshot;

      try {
        const q = query(
          researchRef,
          where('researcherId', '==', user.id),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderByError) {
        const q = query(
          researchRef,
          where('researcherId', '==', user.id)
        );
        querySnapshot = await getDocs(q);
      }

      const researchList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.projectTitle || data.title || t('noTitle', 'ללא כותרת'),
          researcher: data.researcherName || data.researcher || t('researcher', 'חוקר'),
          status: data.status || 'pending',
          submissionStatus: data.submissionStatus || 'submitted',
          hasPatent: data.hasPatent || false,
          submissionDate: toDateString(data.submissionDate || data.createdAt),
          isNew: data.isNew || false,
        };
      });

      researchList.sort((a, b) => {
        const dateA = new Date(a.submissionDate || 0);
        const dateB = new Date(b.submissionDate || 0);
        return dateB - dateA;
      });

      setResearchData(researchList);
    } catch (err) {
      console.error('Error fetching research:', err);
      setResearchError(t('loadResearchListError', 'שגיאה בטעינת מחקרים'));
      setResearchData([]);
    } finally {
      setResearchLoading(false);
    }
  }, [userRole, user?.id, t]);

  // Fetch patents data
  const fetchPatents = React.useCallback(async () => {
    if (!db || userRole !== 'RESEARCHER' || !user?.id) {
      setPatentsLoading(false);
      return;
    }

    setPatentsLoading(true);
    setPatentsError('');
    
    try {
      const patentsRef = collection(db, 'patents');
      let querySnapshot;

      try {
        const q = query(
          patentsRef,
          where('researcherId', '==', user.id),
          orderBy('registrationDate', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderByError) {
        const q = query(
          patentsRef,
          where('researcherId', '==', user.id)
        );
        querySnapshot = await getDocs(q);
      }

      const patentsList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.projectTitle || t('noTitle', 'ללא כותרת'),
          researcher: data.researcherName || data.researcher || t('researcher', 'חוקר'),
          status: normalizePatentStatus(data.status) || PATENT_STATUS_PROVISIONAL,
          submissionStatus: data.submissionStatus || 'submitted',
          registrationDate: toDateString(data.registrationDate || data.submissionDate || data.createdAt),
          isNew: data.isNew || false,
        };
      });

      patentsList.sort((a, b) => {
        const dateA = new Date(a.registrationDate || 0);
        const dateB = new Date(b.registrationDate || 0);
        return dateB - dateA;
      });

      setPatentsData(patentsList);
    } catch (err) {
      console.error('Error fetching patents:', err);
      setPatentsError(t('loadPatentsListError', 'שגיאה בטעינת פטנטים'));
      setPatentsData([]);
    } finally {
      setPatentsLoading(false);
    }
  }, [userRole, user?.id, t]);

  // Fetch articles data
  const fetchArticles = React.useCallback(async () => {
    if (!db || userRole !== 'RESEARCHER' || !user?.id) {
      setArticlesLoading(false);
      return;
    }

    setArticlesLoading(true);
    setArticlesError('');
    
    try {
      const articlesRef = collection(db, 'articles');
      let querySnapshot;

      try {
        const q = query(
          articlesRef,
          where('researcherId', '==', user.id),
          orderBy('publicationDate', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderByError) {
        const q = query(
          articlesRef,
          where('researcherId', '==', user.id)
        );
        querySnapshot = await getDocs(q);
      }

      const articlesList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || t('noTitle', 'ללא כותרת'),
          researcher: data.researcherName || data.researcher || t('researcher', 'חוקר'),
          status: data.status || 'in-review',
          submissionStatus: data.submissionStatus || 'submitted',
          publicationDate: toDateString(data.publicationDate || data.createdAt),
          publicationType: data.publicationType || 'journal',
          isNew: data.isNew || false,
          createdAt: data.createdAt || data.submittedAt || null,
        };
      });

      articlesList.sort((a, b) => {
        const dateA = new Date(a.publicationDate || 0);
        const dateB = new Date(b.publicationDate || 0);
        return dateB - dateA;
      });

      setArticlesData(articlesList);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setArticlesError(t('loadArticlesListError', 'שגיאה בטעינת מאמרים'));
      setArticlesData([]);
    } finally {
      setArticlesLoading(false);
    }
  }, [userRole, user?.id, t]);

  useEffect(() => {
    if (userRole === 'RESEARCHER' && user) {
      fetchResearch();
      fetchPatents();
      fetchArticles();
    }
  }, [userRole, user?.id, fetchResearch, fetchPatents, fetchArticles]);

  // Refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRole === 'RESEARCHER' && user) {
        fetchResearch();
        fetchPatents();
        fetchArticles();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userRole, user, fetchResearch, fetchPatents, fetchArticles]);

  const handleResearchClick = (research) => {
    if (research.submissionStatus === 'draft') {
      navigate(`/research/new?edit=${research.id}`);
      return;
    }
    navigate(`/research/${research.id}`);
  };

  const handlePatentClick = (patent) => {
    if (patent.submissionStatus === 'draft') {
      navigate(`/patents/new?edit=${patent.id}`);
      return;
    }
    navigate(`/patents/${patent.id}`);
  };

  const handleArticleClick = (article) => {
    if (article.submissionStatus === 'draft') {
      navigate(`/articles/new?edit=${article.id}`);
      return;
    }
    navigate(`/articles/${article.id}`);
  };

  const handleAddResearch = () => {
    navigate('/research/new');
  };

  const handleAddPatent = () => {
    navigate('/patents/new');
  };

  const handleAddArticle = () => {
    navigate('/articles/new');
  };

  // Tasks state for calendar
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  // Fetch tasks from Firebase - research proposals + patents subcollections
  // Tasks are stored in: researchProposals/{proposalId}/tasks and patents/{patentId}/tasks
  useEffect(() => {
    if (!db || !userRole) {
      setTasksLoading(false);
      return;
    }

    setTasksLoading(true);
    console.log('Setting up task refresh from research proposals + patents...', { userRole, userId: user?.id });

    const fetchTasksForCollection = async (collectionName, titleKeys) => {
      let parentQuery;
      const parentRef = collection(db, collectionName);

      if (userRole === 'ADMIN') {
        parentQuery = parentRef;
      } else if (userRole === 'RESEARCHER' && user?.id) {
        parentQuery = query(parentRef, where('researcherId', '==', user.id));
      } else {
        return [];
      }

      const parentSnapshot = await getDocs(parentQuery);
      if (parentSnapshot.docs.length === 0) {
        return [];
      }

      const tasksPromises = parentSnapshot.docs.map(async (parentDoc) => {
        const parentData = parentDoc.data();
        const tasksRef = collection(db, collectionName, parentDoc.id, 'tasks');
        const tasksSnapshot = await getDocs(tasksRef);

        return tasksSnapshot.docs.map((taskDoc) => {
          const data = taskDoc.data();
          let dueDate = '';

          if (data.dueDate) {
            try {
              if (data.dueDate && typeof data.dueDate.toDate === 'function') {
                dueDate = data.dueDate.toDate().toISOString().split('T')[0];
              } else if (data.dueDate && data.dueDate.seconds) {
                dueDate = new Date(data.dueDate.seconds * 1000).toISOString().split('T')[0];
              } else if (typeof data.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)) {
                dueDate = data.dueDate;
              } else if (data.dueDate instanceof Date) {
                dueDate = data.dueDate.toISOString().split('T')[0];
              } else {
                const date = new Date(data.dueDate);
                if (!isNaN(date.getTime())) {
                  dueDate = date.toISOString().split('T')[0];
                }
              }
            } catch (e) {
              console.warn(`Error converting dueDate for task ${taskDoc.id}:`, e, data.dueDate);
            }
          }

          const parentTitle = titleKeys
            .map((key) => parentData?.[key])
            .find((value) => value && String(value).trim().length > 0) || 'ללא כותרת';

          return {
            id: taskDoc.id,
            title: data.title || 'ללא כותרת',
            dueDate,
            status: data.status || 'open',
            researcherId: data.researcherId || parentData?.researcherId || '',
            parentId: parentDoc.id,
            parentTitle,
            parentType: collectionName === 'patents' ? 'patent' : 'research',
            researchProposalId: collectionName === 'researchProposals' ? parentDoc.id : null,
            patentId: collectionName === 'patents' ? parentDoc.id : null,
            researchProposalTitle: collectionName === 'researchProposals' ? parentTitle : undefined
          };
        });
      });

      const tasksArrays = await Promise.all(tasksPromises);
      return tasksArrays.flat();
    };

    // Function to fetch tasks from research proposals + patents
    const fetchTasksFromFirebase = async () => {
      try {
        console.log('Fetching tasks from research proposals and patents...');

        const [researchTasks, patentTasks] = await Promise.all([
          fetchTasksForCollection('researchProposals', ['projectTitle', 'title']),
          fetchTasksForCollection('patents', ['title', 'projectTitle'])
        ]);

        const allTasks = [...researchTasks, ...patentTasks].filter(task => {
          // Only include tasks with valid dueDate in YYYY-MM-DD format
          if (!task.dueDate) {
            console.log('Task without dueDate:', task);
            return false;
          }
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          const isValid = dateRegex.test(task.dueDate);
          if (!isValid) {
            console.log('Task with invalid date format:', task.dueDate, task);
          }
          return isValid;
        });

        setTasks(allTasks);
        console.log('✅ Tasks loaded from Firebase:', {
          researchTasks: researchTasks.length,
          patentTasks: patentTasks.length,
          total: allTasks.length
        });
        if (allTasks.length > 0) {
          console.log('Sample tasks:', allTasks.slice(0, 3));
        } else {
          console.log('⚠️ No tasks found with valid dueDate');
        }
        setTasksLoading(false);
      } catch (err) {
        console.error('❌ Error fetching tasks from Firebase:', err);
        console.error('Error details:', {
          message: err.message,
          code: err.code,
          stack: err.stack
        });
        setTasks([]);
        setTasksLoading(false);
      }
    };

    // Initial fetch
    fetchTasksFromFirebase();

    // Set up periodic refresh instead of real-time listener to avoid permission issues
    // Refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('Refreshing tasks...');
      fetchTasksFromFirebase();
    }, 30000);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up tasks listener');
      clearInterval(refreshInterval);
    };
  }, [userRole, user?.id]);

  // ─── Admin: deadline reminders for all researchers (7 days + 2 days) ──────────
  useEffect(() => {
    const ensureAdminDueSoonNotifications = async () => {
      if (!db || userRole !== 'ADMIN' || tasks.length === 0) return;

      const now = new Date();
      const inSevenDays = new Date(); inSevenDays.setDate(now.getDate() + 7);
      const inTwoDays  = new Date(); inTwoDays.setDate(now.getDate() + 2);

      // Collect candidate tasks for both windows
      const candidateTasks = tasks.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        return !isNaN(due.getTime()) && due >= now && due <= inSevenDays;
      });
      if (candidateTasks.length === 0) return;

      const existingSnap = await getDocs(
        query(collection(db, 'notifications'), where('targetRole', '==', 'ADMIN'), where('type', '==', 'task_due_soon'))
      );
      const existingKeys = new Set(existingSnap.docs.map((d) => d.data().eventKey).filter(Boolean));

      const toCreate = [];
      candidateTasks.forEach((task) => {
        const due = new Date(task.dueDate);
        const dueLabel = due.toLocaleDateString('he-IL');
        const link = task.researchProposalId
          ? `/research/${task.researchProposalId}#tasks`
          : task.patentId ? `/patents/${task.patentId}` : '';

        // 7-day reminder
        const key7 = `admin_task_due_7days:${task.id}:${task.dueDate}`;
        if (!existingKeys.has(key7)) {
          toCreate.push(createNotification({
            userId: 'ADMIN', targetRole: 'ADMIN',
            title: 'תזכורת: מועד הגשה בעוד שבוע',
            message: `המשימה "${task.title}" מגיעה למועד ההגשה בעוד כשבוע (${dueLabel}).`,
            type: 'task_due_soon', entityType: 'task', entityId: task.id, link, eventKey: key7
          }));
        }

        // 2-day reminder (only if within 2 days)
        if (due <= inTwoDays) {
          const key2 = `admin_task_due_2days:${task.id}:${task.dueDate}`;
          if (!existingKeys.has(key2)) {
            toCreate.push(createNotification({
              userId: 'ADMIN', targetRole: 'ADMIN',
              title: 'תזכורת: מועד הגשה מחר-מחרתיים',
              message: `המשימה "${task.title}" מגיעה למועד ההגשה בקרוב מאוד (${dueLabel}).`,
              type: 'task_due_soon', entityType: 'task', entityId: task.id, link, eventKey: key2
            }));
          }
        }
      });

      await Promise.all(toCreate);
    };
    ensureAdminDueSoonNotifications();
  }, [tasks, userRole]);

  // ─── Researcher: deadline reminders (7 days + 2 days) ────────────────────────
  useEffect(() => {
    const ensureDueSoonNotifications = async () => {
      if (!db || userRole !== 'RESEARCHER' || !user?.id || tasks.length === 0) return;

      const now = new Date();
      const inSevenDays = new Date(); inSevenDays.setDate(now.getDate() + 7);
      const inTwoDays  = new Date(); inTwoDays.setDate(now.getDate() + 2);

      const candidateTasks = tasks.filter((task) => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        return !isNaN(due.getTime()) && due >= now && due <= inSevenDays;
      });
      if (candidateTasks.length === 0) return;

      const existingSnap = await getDocs(
        query(collection(db, 'notifications'), where('userId', '==', user.id), where('type', '==', 'task_due_soon'))
      );
      const existingKeys = new Set(existingSnap.docs.map((d) => d.data().eventKey).filter(Boolean));

      const toCreate = [];
      candidateTasks.forEach((task) => {
        const due = new Date(task.dueDate);
        const dueLabel = due.toLocaleDateString('he-IL');
        const link = task.researchProposalId
          ? `/research/${task.researchProposalId}#tasks`
          : task.patentId ? `/patents/${task.patentId}` : '';

        // 7-day reminder
        const key7 = `task_due_7days:${task.id}:${task.dueDate}`;
        if (!existingKeys.has(key7)) {
          toCreate.push(createNotification({
            userId: user.id,
            title: 'תזכורת: מועד הגשה בעוד שבוע',
            message: `המשימה "${task.title}" מגיעה למועד ההגשה בעוד כשבוע (${dueLabel}).`,
            type: 'task_due_soon', entityType: 'task', entityId: task.id, link, eventKey: key7
          }));
        }

        // 2-day reminder (only if within 2 days)
        if (due <= inTwoDays) {
          const key2 = `task_due_2days:${task.id}:${task.dueDate}`;
          if (!existingKeys.has(key2)) {
            toCreate.push(createNotification({
              userId: user.id,
              title: 'תזכורת: מועד הגשה מחר-מחרתיים',
              message: `המשימה "${task.title}" מגיעה למועד ההגשה בקרוב מאוד (${dueLabel}).`,
              type: 'task_due_soon', entityType: 'task', entityId: task.id, link, eventKey: key2
            }));
          }
        }
      });

      await Promise.all(toCreate);
    };

    ensureDueSoonNotifications();
  }, [tasks, userRole, user?.id]);

  // Handle calendar event click
  const handleTaskClick = (task) => {
    console.log('Task clicked:', task);
    if (task.researchProposalId) {
      navigate(`/research/${task.researchProposalId}#tasks`);
      return;
    }
    if (task.patentId) {
      navigate(`/patents/${task.patentId}`);
      return;
    }
    console.log('Task has no research/patent link');
  };

  const getDisplayStatus = (item) =>
    item.submissionStatus === 'draft' ? 'draft' : item.status;

  const getStatusLabel = (status, type = 'research') => {
    if (status === 'draft') {
      return t('draft', 'טיוטה');
    }
    if (type === 'research') {
      switch (status) {
        case 'submitted':
          return t('submittedStatus', 'הוגש');
        case 'awarded':
          return t('awarded', 'זכייה');
        case 'pending':
          return t('pending', 'בהמתנה');
        case 'rejected':
          return t('rejected', 'לא אושר');
        default:
          return status;
      }
    } else if (type === 'patent') {
      return getPatentStatusLabel(status, t);
    } else if (type === 'article') {
      switch (status) {
        case 'submitted':
          return t('submittedStatus', 'הוגש');
        case 'pending':
          return t('pending', 'בהמתנה');
        case 'approved':
          return t('approved', 'אושר');
        case 'published':
          return t('approved', 'אושר');
        case 'in-review':
          return t('pending', 'בהמתנה');
        case 'rejected':
          return t('rejected', 'נדחה');
        default:
          return status;
      }
    }
    return status;
  };

  const getStatusClass = (status, type = 'research') => {
    if (type === 'patent') {
      return getPatentStatusClass(status);
    }
    if (type === 'research' || type === 'article') {
      if (status === 'awarded' || status === 'registered' || status === 'approved' || status === 'published') {
        return 'status-awarded';
      }
      if (status === 'draft') {
        return 'status-draft';
      }
      if (status === 'submitted' || status === 'pending' || status === 'in-process' || status === 'in-review') {
        return 'status-pending';
      }
      if (status === 'rejected') {
        return 'status-rejected';
      }
    }
    return '';
  };

  const renderResearchCard = (research, { closeModal } = {}) => (
    <button
      type="button"
      className="research-card"
      onClick={() => {
        closeModal?.();
        handleResearchClick(research);
      }}
    >
      {shouldShowNewBadge(research.isNew, research.submissionDate) && (
        <span className="new-badge">{t('newBadge', 'חדש!')}</span>
      )}
      <h3 className="research-title">{research.title}</h3>
      <p className="research-researcher">{research.researcher}</p>
      <span className={`status-button ${getStatusClass(getDisplayStatus(research), 'research')}`}>
        {getStatusLabel(getDisplayStatus(research), 'research')}
      </span>
    </button>
  );

  const renderPatentCard = (patent, { closeModal } = {}) => (
    <button
      type="button"
      className="research-card"
      onClick={() => {
        closeModal?.();
        handlePatentClick(patent);
      }}
    >
      {shouldShowNewBadge(patent.isNew, patent.registrationDate) && (
        <span className="new-badge">{t('newBadge', 'חדש!')}</span>
      )}
      <h3 className="research-title">{patent.title}</h3>
      <p className="research-researcher">{patent.researcher}</p>
      <span className={`status-button ${getStatusClass(getDisplayStatus(patent), 'patent')}`}>
        {getStatusLabel(getDisplayStatus(patent), 'patent')}
      </span>
    </button>
  );

  const renderArticleCard = (article, { closeModal } = {}) => (
    <button
      type="button"
      className="research-card"
      onClick={() => {
        closeModal?.();
        handleArticleClick(article);
      }}
    >
      {shouldShowNewBadge(article.isNew, article.createdAt) && (
        <span className="new-badge">{t('newBadge', 'חדש!')}</span>
      )}
      <h3 className="research-title">{article.title}</h3>
      <p className="research-researcher">{article.researcher}</p>
      <span className={`status-button ${getStatusClass(getDisplayStatus(article), 'article')}`}>
        {getStatusLabel(getDisplayStatus(article), 'article')}
      </span>
    </button>
  );

  // Show admin view or researcher view
  if (isAdmin()) {
    return (
      <div className="page-container">
        <div className="page-content">
          <h1>{t('adminHomeTitle', 'עמוד הבית - רשות המחקר')}</h1>
          <p className="welcome-text">{t('welcome', 'ברוכים הבאים למערכת ניהול מחקר')}</p>
          
          <UpcomingTasks />

          {/* Calendar Section for Admin */}
          <div style={{ marginTop: '40px' }}>
            {tasksLoading ? (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#6c757d',
                background: '#f7fafc',
                borderRadius: '8px'
              }}>
                <p>{t('loadingTasks', 'טוען משימות...')}</p>
              </div>
            ) : (
              <TasksCalendarContainer
                allTasks={tasks}
                userRole={userRole}
                userId={user?.id}
                onEventClick={handleTaskClick}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>{t('homePageTitle', 'עמוד הבית')}</h1>
        <p className="welcome-text">{t('welcome', 'ברוכים הבאים למערכת ניהול מחקר')}</p>

        <UpcomingTasks />

        {/* Research Section */}
        <div style={{ marginTop: '40px' }}>
          <h2 style={sectionTitleStyle}>{t('researchCollection', 'אוסף מחקרים')}</h2>
          
          {researchLoading && (
            <div className="no-results">
              <p>{t('loadingResearchList', 'טוען מחקרים...')}</p>
            </div>
          )}

          {researchError && (
            <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
              <p>{researchError}</p>
            </div>
          )}

          {!researchLoading && !researchError && (
            <LimitedCardGrid
              items={researchData}
              renderItem={renderResearchCard}
              showAllModalTitle={t('allResearchTitle', 'כל המחקרים')}
              addCard={(
                <button
                  type="button"
                  className="research-card add-research-card"
                  onClick={handleAddResearch}
                >
                  <h3 className="add-research-title">{t('addNewResearch', 'הוספת מחקר חדש')}</h3>
                </button>
              )}
            />
          )}

          {!researchLoading && !researchError && researchData.length === 0 && (
            <div className="no-results-grid-item" style={{ marginTop: '12px' }}>
              <p>{t('noResearchFound', 'לא נמצאו מחקרים')}</p>
            </div>
          )}
        </div>

        {/* Patents Section */}
        <div style={{ marginTop: '60px' }}>
          <h2 style={sectionTitleStyle}>{t('patents', 'פטנטים')}</h2>
          
          {patentsLoading && (
            <div className="no-results">
              <p>{t('loadingPatentsList', 'טוען פטנטים...')}</p>
            </div>
          )}

          {patentsError && (
            <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
              <p>{patentsError}</p>
            </div>
          )}

          {!patentsLoading && !patentsError && (
            <LimitedCardGrid
              items={patentsData}
              renderItem={renderPatentCard}
              showAllModalTitle={t('allPatentsTitle', 'כל הפטנטים')}
              addCard={(
                <button
                  type="button"
                  className="research-card add-research-card"
                  onClick={handleAddPatent}
                >
                  <h3 className="add-research-title">{t('addNewPatent', 'הוספת פטנט חדש')}</h3>
                </button>
              )}
            />
          )}

          {!patentsLoading && !patentsError && patentsData.length === 0 && (
            <div className="no-results-grid-item" style={{ marginTop: '12px' }}>
              <p>{t('noPatentsFound', 'לא נמצאו פטנטים')}</p>
            </div>
          )}
        </div>

        {/* Articles Section */}
        <div style={{ marginTop: '60px' }}>
          <h2 style={sectionTitleStyle}>{t('articles', 'מאמרים')}</h2>
          
          {articlesLoading && (
            <div className="no-results">
              <p>{t('loadingArticlesList', 'טוען מאמרים...')}</p>
            </div>
          )}

          {articlesError && (
            <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
              <p>{articlesError}</p>
            </div>
          )}

          {!articlesLoading && !articlesError && (
            <LimitedCardGrid
              items={articlesData}
              renderItem={renderArticleCard}
              showAllModalTitle={t('allArticlesTitle', 'כל המאמרים')}
              addCard={(
                <button
                  type="button"
                  className="research-card add-research-card"
                  onClick={handleAddArticle}
                >
                  <h3 className="add-research-title">{t('addNewArticle', 'הוספת מאמר חדש')}</h3>
                </button>
              )}
            />
          )}

          {!articlesLoading && !articlesError && articlesData.length === 0 && (
            <div className="no-results-grid-item" style={{ marginTop: '12px' }}>
              <p>{t('noArticlesFound', 'לא נמצאו מאמרים')}</p>
            </div>
          )}
        </div>

        {/* Calendar Section */}
        <div style={{ marginTop: '60px' }}>
          {tasksLoading ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#6c757d',
              background: '#f7fafc',
              borderRadius: '8px'
            }}>
              <p>{t('loadingTasks', 'טוען משימות...')}</p>
            </div>
          ) : (
            <TasksCalendarContainer
              allTasks={tasks}
              userRole={userRole}
              userId={user?.id}
              onEventClick={handleTaskClick}
            />
          )}
        </div>

      </div>
    </div>
  );
};

export default Home;
