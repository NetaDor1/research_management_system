import React, { useMemo } from 'react';
import './GanttPreview.css';

/**
 * GanttPreview Component
 * 
 * Read-only Gantt chart preview component.
 * 
 * Props:
 * @param {Array} tasks - Array of task objects with { id, title, startMonth, endMonth }
 */
const GanttPreview = ({ tasks = [] }) => {
  const maxMonth = useMemo(() => {
    if (tasks.length === 0) return 36;
    return Math.max(
      36,
      ...tasks.map(task => task.endMonth || 0)
    );
  }, [tasks]);

  // Generate month labels in increments of 6 (6, 12, 18, 24, 30, 36)
  const monthLabels = useMemo(() => {
    const labels = [];
    for (let month = 6; month <= Math.max(36, maxMonth); month += 6) {
      labels.push(month);
    }
    return labels;
  }, [maxMonth]);

  // Calculate task bar position and width (RTL timeline)
  // Snap to 6-month cell boundaries (6, 12, 18, 24, 30, 36).
  const getTaskBarStyle = (task) => {
    const totalMonths = Math.max(6, maxMonth);
    const totalBins = Math.ceil(totalMonths / 6);
    const startMonth = Math.max(1, Math.min(totalMonths, task.startMonth || 1));
    const endMonth = Math.max(startMonth, Math.min(totalMonths, task.endMonth || 1));

    const startBin = Math.floor((startMonth - 1) / 6);
    const endBin = Math.floor((endMonth - 1) / 6);
    const endProgress = (endMonth - (endBin * 6)) / 6;
    const clampedStartBin = Math.max(0, Math.min(totalBins - 1, startBin));
    const clampedEndBin = Math.max(clampedStartBin, Math.min(totalBins - 1, endBin));

    const startProgress = startMonth % 6 === 0 ? 1 : 0;
    const startPercent = ((clampedStartBin + startProgress) / totalBins) * 100;
    const endPercent = ((clampedEndBin + Math.max(0, Math.min(1, endProgress))) / totalBins) * 100;
    const widthPercent = Math.max(1, endPercent - startPercent);

    return {
      right: `${Math.max(0, startPercent)}%`,
      width: `${Math.min(100, widthPercent)}%` // Minimum width of 1%
    };
  };

  if (tasks.length === 0) {
    return (
      <div className="gantt-preview-container">
        <div className="gantt-preview-header">
          <h3>תצוגה מקדימה - Gantt Chart</h3>
        </div>
        <div className="gantt-empty-state">
          <p>אין משימות להצגה. הוסף משימות בטבלה כדי לראות את תוכנית העבודה.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-preview-container">
      <div className="gantt-preview-header">
        <h3>תצוגה מקדימה - Gantt Chart</h3>
        <span className="gantt-subtitle">
          {tasks.length} {tasks.length === 1 ? 'משימה' : 'משימות'} • {maxMonth} חודשים
        </span>
      </div>

      <div className="gantt-chart">
        {/* Month header */}
        <div className="gantt-month-header">
          <div className="gantt-task-label-column">
            <span className="gantt-label-header">משימה</span>
          </div>
          <div className="gantt-timeline">
            {monthLabels.map(month => (
              <div key={month} className="gantt-month-cell">
                {month}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks rows */}
        <div className="gantt-tasks-container">
          {tasks.map((task, index) => {
            const barStyle = getTaskBarStyle(task);
            const duration = (task.endMonth || 1) - (task.startMonth || 1) + 1;
            
            return (
              <div key={task.id || index} className="gantt-task-row">
                <div className="gantt-task-label-column">
                  <span className="gantt-task-label" title={task.title}>
                    {task.title}
                  </span>
                </div>
                <div className="gantt-timeline">
                  {monthLabels.map(month => (
                    <div key={month} className="gantt-month-cell" />
                  ))}
                  {/* Task bar overlay */}
                  <div
                    className="gantt-task-bar"
                    style={barStyle}
                    title={`${task.title}: חודשים ${task.startMonth}-${task.endMonth} (${duration} חודשים)`}
                  >
                    <span className="gantt-task-bar-label">
                      {task.title}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="gantt-legend">
        <div className="gantt-legend-item">
          <div className="gantt-legend-color"></div>
          <span>משימה פעילה</span>
        </div>
      </div>
    </div>
  );
};

export default GanttPreview;
