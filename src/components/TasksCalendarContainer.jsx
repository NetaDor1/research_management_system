import React, { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import TasksCalendar from './TasksCalendar';

/**
 * TasksCalendarContainer Component
 * 
 * Architecture: Container component that handles role-based filtering
 * - Receives all tasks and user role/ID
 * - Filters tasks based on role:
 *   - ADMIN (Research Authority): sees all tasks
 *   - RESEARCHER: sees only their own tasks (filtered by researcherId)
 * - Passes filtered tasks to presentation component
 * 
 * Props:
 * @param {Array} allTasks - All tasks from data source
 * @param {string} userRole - Current user role: "ADMIN" | "RESEARCHER"
 * @param {string} userId - Current user ID (researcherId for filtering)
 * @param {Function} onEventClick - Callback when an event is clicked
 */
const TasksCalendarContainer = ({ allTasks = [], userRole, userId, onEventClick }) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const sectionTitleStyle = {
    marginBottom: '20px',
    textAlign,
    borderBottom: '3px solid rgb(188, 192, 203)',
    paddingBottom: '10px',
    fontWeight: 'bold',
    color: '#2d3748',
  };

  const filteredTasks = useMemo(() => {
    console.log('TasksCalendarContainer - Filtering tasks:', {
      allTasksCount: allTasks?.length || 0,
      userRole,
      userId
    });

    if (!allTasks || allTasks.length === 0) {
      console.log('No tasks to filter');
      return [];
    }

    if (userRole === 'ADMIN') {
      console.log('Admin view - showing all tasks:', allTasks.length);
      return allTasks;
    }

    if (userRole === 'RESEARCHER' && userId) {
      const filtered = allTasks.filter(task => task.researcherId === userId);
      console.log('Researcher view - filtered tasks:', filtered.length, 'out of', allTasks.length);
      return filtered;
    }

    console.log('No matching role/userId - returning empty array');
    return [];
  }, [allTasks, userRole, userId]);
  
  console.log('TasksCalendarContainer - Filtered tasks count:', filteredTasks.length);

  const tasksFoundLabel = t('calendarTasksFoundCount', 'נמצאו {count} משימות להצגה').replace(
    '{count}',
    String(filteredTasks.length)
  );
  const tasksFilteredHint = t(
    'calendarTasksFilteredHint',
    'נמצאו {count} משימות בסך הכל, אך הן לא תואמות את התנאים להצגה'
  ).replace('{count}', String(allTasks.length));

  return (
    <div className="tasks-calendar-wrapper">
      <h2 style={sectionTitleStyle}>
        {t('tasksCalendarTitle', 'לוח שנה - משימות')}
      </h2>
      
      {filteredTasks.length === 0 ? (
        <>
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#6c757d',
            background: '#f7fafc',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <p>{t('calendarNoTasksToShow', 'אין משימות להצגה')}</p>
            {allTasks.length > 0 && (
              <p style={{ fontSize: '14px', marginTop: '10px', color: '#999' }}>
                ({tasksFilteredHint})
              </p>
            )}
          </div>
          <TasksCalendar 
            tasks={[]} 
            onEventClick={onEventClick}
          />
        </>
      ) : (
        <>
          <div style={{ 
            marginBottom: '15px', 
            textAlign, 
            fontSize: '14px', 
            color: '#666' 
          }}>
            {tasksFoundLabel}
          </div>
          <TasksCalendar 
            tasks={filteredTasks} 
            onEventClick={onEventClick}
          />
        </>
      )}
    </div>
  );
};

export default TasksCalendarContainer;
