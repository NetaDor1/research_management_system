import React, { useState, useEffect } from 'react';
import TasksTable from './TasksTable';
import GanttPreview from './GanttPreview';
import './WorkPlanSection.css';

/**
 * WorkPlanSection Component
 * 
 * Main component for managing research work plan with Gantt chart preview.
 * 
 * Props:
 * @param {Array} initialTasks - Initial tasks array (for editing existing research)
 * @param {Function} onTasksChange - Callback when tasks change (for form submission)
 * @param {Boolean} readOnly - If true, only display mode (no editing)
 */
const WorkPlanSection = ({ initialTasks = [], onTasksChange, readOnly = false }) => {
  const [tasks, setTasks] = useState(initialTasks);

  // Update tasks when initialTasks changes (e.g., when loading existing research)
  useEffect(() => {
    if (initialTasks) {
      setTasks(initialTasks);
    }
  }, [initialTasks]);

  // Notify parent when tasks change
  useEffect(() => {
    if (onTasksChange) {
      onTasksChange(tasks);
    }
  }, [tasks, onTasksChange]);

  const handleAddTask = () => {
    const newTask = {
      id: `task-${Date.now()}`,
      title: '',
      startMonth: 1,
      endMonth: 1
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleRemoveTask = (taskId) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleTaskChange = (taskId, field, value) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updated = { ...task, [field]: value };
        
        // Validation: ensure endMonth >= startMonth
        if (field === 'startMonth') {
          const startMonth = parseInt(value, 10);
          const endMonth = parseInt(updated.endMonth, 10);
          if (endMonth < startMonth) {
            updated.endMonth = startMonth;
          }
        } else if (field === 'endMonth') {
          const startMonth = parseInt(updated.startMonth, 10);
          const endMonth = parseInt(value, 10);
          if (endMonth < startMonth) {
            updated.endMonth = startMonth;
          }
        }
        
        return updated;
      }
      return task;
    }));
  };

  // Filter out empty tasks (tasks without title)
  const validTasks = tasks.filter(task => task.title && task.title.trim() !== '');

  return (
    <div className="work-plan-section">
      <div className="work-plan-header">
        <h2>תוכנית עבודה / Gantt</h2>
        {!readOnly && (
          <p className="section-description">
            הוסף משימות מחקר עם חודשי התחלה וסיום. התצוגה המקדימה תתעדכן אוטומטית.
          </p>
        )}
      </div>

      <div className="work-plan-content">
        {!readOnly ? (
          <>
            <div className="work-plan-left">
              <TasksTable
                tasks={tasks}
                onAddTask={handleAddTask}
                onRemoveTask={handleRemoveTask}
                onTaskChange={handleTaskChange}
              />
            </div>
            <div className="work-plan-right">
              <GanttPreview tasks={validTasks} />
            </div>
          </>
        ) : (
          <div className="work-plan-readonly">
            <GanttPreview tasks={validTasks} />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkPlanSection;
