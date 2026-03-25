import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../services/firebase';
import './UpcomingTasks.css';

const DEFAULT_RANGE_DAYS = 14;

const UpcomingTasks = () => {
  const navigate = useNavigate();
  const { userRole, user, isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeDays, setRangeDays] = useState(DEFAULT_RANGE_DAYS);

  const parseDueDate = (value) => {
    if (!value) return null;
    if (value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    if (value && value.seconds) {
      return new Date(value.seconds * 1000);
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return null;
  };

  useEffect(() => {
    const fetchUpcomingTasks = async () => {
      if (!db || !userRole) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + rangeDays);
        endDate.setHours(23, 59, 59, 999);

        const getParents = async (collectionName) => {
          const baseRef = collection(db, collectionName);
          try {
            if (userRole === 'RESEARCHER' && user?.id) {
              return getDocs(query(baseRef, where('researcherId', '==', user.id)));
            }
            return getDocs(baseRef);
          } catch (err) {
            console.warn(`Failed to load ${collectionName} parents:`, err?.message || err);
            return { docs: [] };
          }
        };

        const fetchTasksForParent = async (collectionName, parentDoc) => {
          const parentData = parentDoc.data();
          const tasksRef = collection(db, collectionName, parentDoc.id, 'tasks');
          let tasksSnapshot;
          try {
            tasksSnapshot = await getDocs(tasksRef);
          } catch (err) {
            console.warn(`Failed to load tasks for ${collectionName}/${parentDoc.id}:`, err?.message || err);
            return [];
          }

          return tasksSnapshot.docs.map((taskDoc) => {
            const data = taskDoc.data();
            const dueDate = parseDueDate(data.dueDate);
            if (!dueDate || dueDate < startDate || dueDate > endDate) {
              return null;
            }

            const baseTask = {
              id: taskDoc.id,
              title: data.title || t('notSpecified', 'לא צוין'),
              status: data.status || 'pending',
              dueDate,
              dueDateLabel: dueDate.toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL'),
              parentId: parentDoc.id,
              researcherName: parentData.researcherName || parentData.researcher || t('researcher', 'חוקר')
            };

            if (collectionName === 'researchProposals') {
              return {
                ...baseTask,
                type: 'research',
                parentTitle: parentData.projectTitle || parentData.title || t('notSpecified', 'לא צוין')
              };
            }

            return {
              ...baseTask,
              type: 'patent',
              parentTitle: parentData.title || parentData.projectTitle || t('notSpecified', 'לא צוין')
            };
          }).filter(Boolean);
        };

        const [researchSnapshot, patentsSnapshot] = await Promise.all([
          getParents('researchProposals'),
          getParents('patents')
        ]);

        const researchTasksPromise = Promise.all(
          researchSnapshot.docs.map((doc) => fetchTasksForParent('researchProposals', doc))
        );
        const patentsTasksPromise = Promise.all(
          patentsSnapshot.docs.map((doc) => fetchTasksForParent('patents', doc))
        );

        const [researchTasks, patentsTasks] = await Promise.all([researchTasksPromise, patentsTasksPromise]);
        const mergedTasks = [...researchTasks.flat(), ...patentsTasks.flat()];

        mergedTasks.sort((a, b) => a.dueDate - b.dueDate);
        setTasks(mergedTasks);
      } catch (err) {
        console.error('Error fetching upcoming tasks:', err);
        setError(t('upcomingTasksLoadError', 'שגיאה בטעינת משימות קרובות'));
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingTasks();
  }, [userRole, user?.id, rangeDays, t, language]);

  const handleTaskClick = (task) => {
    if (task.type === 'research') {
      navigate(`/research/${task.parentId}`);
      return;
    }
    if (task.type === 'patent') {
      navigate(`/patents/${task.parentId}`);
    }
  };

  const upcomingTitle = useMemo(() => {
    return t('upcomingTasksTitle', 'משימות קרובות');
  }, [t]);

  const rangeOptions = useMemo(() => ([
    { value: 7, label: t('range7Days', '7 ימים') },
    { value: 14, label: t('range14Days', '14 ימים') },
    { value: 30, label: t('range30Days', 'חודש') },
    { value: 90, label: t('range90Days', '3 חודשים') }
  ]), [t]);

  return (
    <div className="upcoming-tasks">
      <div className="upcoming-tasks-header">
        <h2 className="upcoming-tasks-title">{upcomingTitle}</h2>
        <label className="upcoming-tasks-range">
          <span className="upcoming-tasks-range-label">{t('dueDate', 'תאריך יעד')}</span>
          <select
            className="upcoming-tasks-range-select"
            value={rangeDays}
            onChange={(event) => setRangeDays(Number(event.target.value))}
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <div className="upcoming-tasks-empty">
          <p>{t('loadingUpcomingTasks', 'טוען משימות קרובות...')}</p>
        </div>
      )}

      {!loading && error && (
        <div className="upcoming-tasks-empty upcoming-tasks-error">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="upcoming-tasks-empty">
          <p>{t('noTasksInRange', 'אין משימות בטווח הנבחר')}</p>
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="upcoming-tasks-list">
          {tasks.map((task) => (
            <button
              key={`${task.type}-${task.parentId}-${task.id}`}
              type="button"
              className="upcoming-task-card"
              onClick={() => handleTaskClick(task)}
            >
              <div className="upcoming-task-header">
                <span className={`upcoming-task-type upcoming-task-type--${task.type}`}>
                  {task.type === 'research' ? t('research', 'מחקרים') : t('patents', 'פטנטים')}
                </span>
                <span className="upcoming-task-date">{task.dueDateLabel}</span>
              </div>
              <h3 className="upcoming-task-title">{task.title}</h3>
              <p className="upcoming-task-parent">{task.parentTitle}</p>
              {isAdmin() && (
                <p className="upcoming-task-researcher">{t('researcher', 'חוקר')}: {task.researcherName}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingTasks;
