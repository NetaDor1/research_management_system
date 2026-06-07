import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './TasksTable.css';

const TasksTable = ({ tasks, onAddTask, onRemoveTask, onTaskChange }) => {
  const { t } = useLanguage();
  const monthOptions = Array.from({ length: 36 }, (_, i) => i + 1);

  return (
    <div className="tasks-table-container">
      <div className="tasks-table-header">
        <h3>{t('tasksList', 'רשימת משימות')}</h3>
        <button
          type="button"
          className="btn-add-task"
          onClick={onAddTask}
        >
          + {t('addTask', 'הוסף משימה')}
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="tasks-empty-state">
          <p>{t('noTasks', 'אין משימות. לחץ על "הוסף משימה" כדי להתחיל.')}</p>
        </div>
      ) : (
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>{t('taskTitle', 'כותרת המשימה')}</th>
                <th>{t('startMonth', 'חודש התחלה')}</th>
                <th>{t('endMonth', 'חודש סיום')}</th>
                <th>{t('duration', 'משך (חודשים)')}</th>
                <th>{t('actions', 'פעולות')}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const duration = task.endMonth - task.startMonth + 1;
                const hasError = task.endMonth < task.startMonth;

                return (
                  <tr key={task.id} className={hasError ? 'task-row-error' : ''}>
                    <td>
                      <input
                        type="text"
                        value={task.title || ''}
                        onChange={(e) => onTaskChange(task.id, 'title', e.target.value)}
                        placeholder={t('taskTitlePlaceholder', 'הכנס כותרת משימה')}
                        className="task-title-input"
                      />
                    </td>
                    <td>
                      <select
                        value={task.startMonth || 1}
                        onChange={(e) => onTaskChange(task.id, 'startMonth', parseInt(e.target.value, 10))}
                        className="task-month-select"
                      >
                        {monthOptions.map(month => (
                          <option key={month} value={month}>{month}</option>
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
                            <option key={month} value={month}>{month}</option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <span className="task-duration">
                        {duration} {duration === 1 ? t('month', 'חודש') : t('months', 'חודשים')}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-remove-task"
                        onClick={() => onRemoveTask(task.id)}
                        aria-label={t('removeTask', 'הסר משימה')}
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
