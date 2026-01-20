import React from 'react';
import './TasksTable.css';

/**
 * TasksTable Component
 * 
 * Editable table for managing research tasks.
 * 
 * Props:
 * @param {Array} tasks - Array of task objects
 * @param {Function} onAddTask - Callback to add a new task
 * @param {Function} onRemoveTask - Callback to remove a task
 * @param {Function} onTaskChange - Callback when a task field changes
 */
const TasksTable = ({ tasks, onAddTask, onRemoveTask, onTaskChange }) => {
  // Generate month options (1-36)
  const monthOptions = Array.from({ length: 36 }, (_, i) => i + 1);

  return (
    <div className="tasks-table-container">
      <div className="tasks-table-header">
        <h3>רשימת משימות</h3>
        <button
          type="button"
          className="btn-add-task"
          onClick={onAddTask}
        >
          + הוסף משימה
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="tasks-empty-state">
          <p>אין משימות. לחץ על "הוסף משימה" כדי להתחיל.</p>
        </div>
      ) : (
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>כותרת המשימה</th>
                <th>חודש התחלה</th>
                <th>חודש סיום</th>
                <th>משך (חודשים)</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => {
                const duration = task.endMonth - task.startMonth + 1;
                const hasError = task.endMonth < task.startMonth;
                
                return (
                  <tr key={task.id} className={hasError ? 'task-row-error' : ''}>
                    <td>
                      <input
                        type="text"
                        value={task.title || ''}
                        onChange={(e) => onTaskChange(task.id, 'title', e.target.value)}
                        placeholder="הכנס כותרת משימה"
                        className="task-title-input"
                        dir="rtl"
                      />
                    </td>
                    <td>
                      <select
                        value={task.startMonth || 1}
                        onChange={(e) => onTaskChange(task.id, 'startMonth', parseInt(e.target.value, 10))}
                        className="task-month-select"
                      >
                        {monthOptions.map(month => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={task.endMonth || 1}
                        onChange={(e) => onTaskChange(task.id, 'endMonth', parseInt(e.target.value, 10))}
                        className="task-month-select"
                        style={hasError ? { borderColor: '#dc3545' } : {}}
                      >
                        {monthOptions
                          .filter(month => month >= (task.startMonth || 1))
                          .map(month => (
                            <option key={month} value={month}>
                              {month}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <span className="task-duration">
                        {duration} {duration === 1 ? 'חודש' : 'חודשים'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-remove-task"
                        onClick={() => onRemoveTask(task.id)}
                        aria-label="הסר משימה"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TasksTable;
