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
    const months = tasks
      .flatMap((task) => [task.startMonth, task.endMonth])
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);

    return Math.max(36, ...(months.length ? months : [1]));
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
  const normalizeMonthValue = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  const getTaskBarStyle = (task) => {
    const totalMonths = Math.max(6, maxMonth);
    const totalBins = Math.ceil(totalMonths / 6);

    const normalizedStartMonth = normalizeMonthValue(task?.startMonth, 1);
    const normalizedEndMonth = normalizeMonthValue(task?.endMonth, normalizedStartMonth);

    const startMonth = Math.max(1, Math.min(totalMonths, normalizedStartMonth));
    const endMonth = Math.max(
      startMonth,
      Math.min(totalMonths, normalizedEndMonth)
    );

    const startBin = Math.floor((startMonth - 1) / 6);
    const endBin = Math.floor((endMonth - 1) / 6);

    // Fractional progress inside the 6-month cell:
    // - For startMonth=1 => 0/6 of the first cell
    // - For startMonth=6 => 5/6 of the first cell
    const startProgress = (startMonth - (startBin * 6 + 1)) / 6;
    // - For endMonth=1 => 1/6 of the cell
    // - For endMonth=6 => 6/6 of the cell (i.e. cell end)
    const endProgress = (endMonth - (endBin * 6)) / 6;

    const clampedStartBin = Math.max(0, Math.min(totalBins - 1, startBin));
    const clampedEndBin = Math.max(clampedStartBin, Math.min(totalBins - 1, endBin));

    const startPercent = ((clampedStartBin + Math.max(0, Math.min(0.999999, startProgress))) / totalBins) * 100;
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
            const totalMonths = Math.max(6, maxMonth);
            const normalizedStartMonth = normalizeMonthValue(task?.startMonth, 1);
            const normalizedEndMonth = normalizeMonthValue(task?.endMonth, normalizedStartMonth);
            const startMonth = Math.max(1, Math.min(totalMonths, normalizedStartMonth));
            const endMonth = Math.max(startMonth, Math.min(totalMonths, normalizedEndMonth));
            const duration = endMonth - startMonth + 1;
            
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
                    title={`${task.title}: חודשים ${startMonth}-${endMonth} (${duration} חודשים)`}
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
