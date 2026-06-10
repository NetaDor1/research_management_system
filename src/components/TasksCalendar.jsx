import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import heLocale from '@fullcalendar/core/locales/he';
import enGbLocale from '@fullcalendar/core/locales/en-gb';
import { useLanguage } from '../context/LanguageContext';
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
 *     researcherId: string,
 *     researchProposalId: string,
 *     researchProposalTitle: string
 *   }
 * @param {Function} onEventClick - Callback when an event is clicked
 */
const TasksCalendar = ({ tasks = [], onEventClick }) => {
  const { t, isRTL, language } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const calendarLocale = language === 'en' ? enGbLocale : heLocale;

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
      const eventColor = task.status === 'done' ? '#5a7f66' : '#b86b6b'; // Muted green/red
      
      // Create title with research proposal name first, then task name
      const parentTitle = task.parentTitle || task.researchProposalTitle;
      const eventTitle = parentTitle
        ? `${parentTitle} - ${task.title || t('notSpecified', 'לא צוין')}`
        : task.title || t('notSpecified', 'לא צוין');
      
      return {
        id: task.id,
        title: eventTitle,
        start: task.dueDate, // FullCalendar will use this as the event date (YYYY-MM-DD format)
        backgroundColor: eventColor,
        borderColor: eventColor,
        textColor: '#ffffff',
        extendedProps: {
          taskId: task.id,
          status: task.status,
          researcherId: task.researcherId,
          researchProposalId: task.researchProposalId,
          researchProposalTitle: task.researchProposalTitle,
          originalTask: task
        }
      };
    }).filter(event => event !== null); // Remove invalid events
  }, [tasks, t]);
  
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
        <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666', textAlign }}>
          {events.length} {t('calendarTasksCount', 'משימות בלוח השנה')}
        </div>
      )}
      {events.length === 0 && (
        <div style={{ marginBottom: '10px', fontSize: '14px', color: '#999', textAlign }}>
          {t('calendarNoTasks', 'אין משימות להצגה בלוח השנה')}
        </div>
      )}
      <div style={{ width: '100%' }}>
        <FullCalendar
          key={language}
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={handleEventClick}
          locale={calendarLocale}
          headerToolbar={{
            left: 'prev',
            center: 'title',
            right: 'next'
          }}
          direction={isRTL ? 'rtl' : 'ltr'}
          height="auto"
          contentHeight="auto"
          aspectRatio={1.35}
          firstDay={0}
        />
      </div>
    </div>
  );
};

export default TasksCalendar;
