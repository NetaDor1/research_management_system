import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import './TasksCalendar.css';

/**
 * TasksCalendar Component
 * 
 * Architecture: Presentation-only component
 * - Receives pre-filtered tasks as props
 * - Does NOT perform any role-based filtering
 * - Converts tasks to FullCalendar events
 * - Displays events in month view
 * - Handles event clicks
 * 
 * Props:
 * @param {Array} tasks - Array of task objects with structure:
 *   {
 *     id: string,
 *     title: string,
 *     dueDate: string, // YYYY-MM-DD
 *     status: "open" | "done",
 *     researcherId: string
 *   }
 * @param {Function} onEventClick - Callback when an event is clicked
 */
const TasksCalendar = ({ tasks = [], onEventClick }) => {
  // Convert tasks to FullCalendar events
  const events = React.useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return [];
    }
    
    return tasks.map((task) => {
      // Validate task has required fields
      if (!task.dueDate || !task.id) {
        console.warn('Task missing required fields:', task);
        return null;
      }
      
      // Use dueDate as both start and end (single date event)
      const eventColor = task.status === 'done' ? '#28a745' : '#dc3545'; // Green for done, red for open
      
      return {
        id: task.id,
        title: task.title || 'ללא כותרת',
        start: task.dueDate, // FullCalendar will use this as the event date (YYYY-MM-DD format)
        backgroundColor: eventColor,
        borderColor: eventColor,
        textColor: '#ffffff',
        extendedProps: {
          taskId: task.id,
          status: task.status,
          researcherId: task.researcherId,
          originalTask: task
        }
      };
    }).filter(event => event !== null); // Remove invalid events
  }, [tasks]);
  
  console.log('TasksCalendar rendering with', events.length, 'events');

  const handleEventClick = (clickInfo) => {
    if (onEventClick) {
      onEventClick(clickInfo.event.extendedProps.originalTask);
    } else {
      // Default placeholder handler
      console.log('Task clicked:', clickInfo.event.extendedProps.originalTask);
    }
  };

  // Debug: Log if calendar is rendering
  React.useEffect(() => {
    console.log('TasksCalendar component mounted/updated with', events.length, 'events');
  }, [events.length]);

  // Always render calendar, even with no events
  return (
    <div className="tasks-calendar-container">
      {events.length > 0 && (
        <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666', textAlign: 'right' }}>
          {events.length} משימות בלוח השנה
        </div>
      )}
      {events.length === 0 && (
        <div style={{ marginBottom: '10px', fontSize: '14px', color: '#999', textAlign: 'right' }}>
          אין משימות להצגה בלוח השנה
        </div>
      )}
      <div style={{ width: '100%' }}>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={handleEventClick}
          headerToolbar={{
            left: 'prev',
            center: 'title',
            right: 'next'
          }}
          direction="rtl" // Right-to-left for Hebrew
          height="auto"
          contentHeight="auto"
          aspectRatio={1.35}
          firstDay={0} // Sunday as first day (common in Hebrew calendars)
        />
      </div>
    </div>
  );
};

export default TasksCalendar;
