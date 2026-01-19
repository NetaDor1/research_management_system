import React, { useMemo } from 'react';
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
  // Role-based filtering logic
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

    // Research Authority (ADMIN) sees all tasks
    if (userRole === 'ADMIN') {
      console.log('Admin view - showing all tasks:', allTasks.length);
      return allTasks;
    }

    // Researcher sees only their own tasks
    if (userRole === 'RESEARCHER' && userId) {
      const filtered = allTasks.filter(task => task.researcherId === userId);
      console.log('Researcher view - filtered tasks:', filtered.length, 'out of', allTasks.length);
      return filtered;
    }

    // Default: no tasks if role/userId not recognized
    console.log('No matching role/userId - returning empty array');
    return [];
  }, [allTasks, userRole, userId]);
  
  console.log('TasksCalendarContainer - Filtered tasks count:', filteredTasks.length);

  return (
    <div className="tasks-calendar-wrapper">
      <h2 style={{ 
        marginBottom: '20px', 
        textAlign: 'right',
        borderBottom: '3px solid rgb(188, 192, 203)',
        paddingBottom: '10px',
        fontWeight: 'bold',
        color: '#2d3748'
      }}>
        לוח שנה - משימות
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
            <p>אין משימות להצגה</p>
            {allTasks.length > 0 && (
              <p style={{ fontSize: '14px', marginTop: '10px', color: '#999' }}>
                (נמצאו {allTasks.length} משימות בסך הכל, אך הן לא תואמות את התנאים להצגה)
              </p>
            )}
          </div>
          {/* Show empty calendar even when no tasks */}
          <TasksCalendar 
            tasks={[]} 
            onEventClick={onEventClick}
          />
        </>
      ) : (
        <>
          <div style={{ 
            marginBottom: '15px', 
            textAlign: 'right', 
            fontSize: '14px', 
            color: '#666' 
          }}>
            נמצאו {filteredTasks.length} משימות להצגה
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
