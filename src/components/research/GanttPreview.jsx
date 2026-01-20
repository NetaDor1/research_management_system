import React, { useMemo, useRef, useEffect, useState } from 'react';
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
  const timelineRef = useRef(null);
  const [timelineWidth, setTimelineWidth] = useState(480); // Default: 6 columns * 80px

  const maxMonth = useMemo(() => {
    if (tasks.length === 0) return 36;
    return Math.max(
      36,
      ...tasks.map(task => task.endMonth || 0)
    );
  }, [tasks]);

  // Generate month labels in increments of 6 (6, 12, 18, 24, 30, 36)
  // These are displayed RTL (right to left), but we calculate positions LTR (left to right)
  // So: month 1 (in column 6) is at left=0%, month 36 (in column 36) is at left=~100%
  const monthLabels = useMemo(() => {
    const labels = [];
    for (let month = 6; month <= Math.max(36, maxMonth); month += 6) {
      labels.push(month);
    }
    return labels; // [6, 12, 18, 24, 30, 36] - displayed RTL but calculated LTR
  }, [maxMonth]);

  // Measure timeline width
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [monthLabels.length]);

  // Calculate task bar position and width
  // The timeline displays months 6, 12, 18, 24, 30, 36
  // Each displayed month represents a 6-month period:
  // 6 = months 1-6, 12 = months 7-12, 18 = months 13-18, etc.
  const getTaskBarStyle = (task) => {
    const startMonth = task.startMonth || 1;
    const endMonth = task.endMonth || 1;
    
    // Helper: Get which column (displayed month) a given month belongs to
    const getColumnForMonth = (month) => {
      if (month <= 6) return 6;
      if (month <= 12) return 12;
      if (month <= 18) return 18;
      if (month <= 24) return 24;
      if (month <= 30) return 30;
      return 36;
    };
    
    // Helper: Get the start month of a column (e.g., column 12 starts at month 7)
    const getColumnStartMonth = (column) => {
      return column === 6 ? 1 : column - 5;
    };
    
    // Helper: Get position within a column (0.0 to 1.0)
    const getPositionInColumn = (month, column) => {
      const columnStart = getColumnStartMonth(column);
      const columnEnd = column;
      // Position within the 6-month period (0 = start of column, 1 = end of column)
      const position = (month - columnStart) / (columnEnd - columnStart + 1);
      return Math.max(0, Math.min(1, position));
    };
    
    const startColumn = getColumnForMonth(startMonth);
    const endColumn = getColumnForMonth(endMonth);
    
    // Find indices in the displayed months array
    // monthLabels is [6, 12, 18, 24, 30, 36] - displayed RTL
    // In RTL display: 6 (months 1-6) is rightmost (index 0), 36 (months 31-36) is leftmost (index 5)
    // But CSS left is always calculated from left edge
    // So: month 1 (in column 6, index 0) should be at left = 0%
    //     month 36 (in column 36, index 5) should be at left = ~100%
    const startColumnIndex = monthLabels.indexOf(startColumn);
    const endColumnIndex = monthLabels.indexOf(endColumn);
    
    // Calculate column width based on actual timeline width
    const columnWidth = timelineWidth / monthLabels.length;
    
    // Calculate position within column (0.0 to 1.0)
    const startPositionInColumn = getPositionInColumn(startMonth, startColumn);
    const endPositionInColumn = getPositionInColumn(endMonth, endColumn);
    
    // Calculate left position in pixels (from left edge)
    // Column 6 (index 0) is at left = 0, Column 36 (index 5) is at left = 5 * columnWidth
    const leftPx = (startColumnIndex * columnWidth) + (startPositionInColumn * columnWidth);
    
    // Calculate right position (end of task) in pixels
    const rightPx = (endColumnIndex * columnWidth) + (endPositionInColumn * columnWidth);
    
    // Convert to percentages based on actual timeline width
    const leftPercent = (leftPx / timelineWidth) * 100;
    const widthPercent = ((rightPx - leftPx) / timelineWidth) * 100;
    
    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.max(1, widthPercent)}%` // Minimum width of 1%
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
          <div className="gantt-timeline" ref={timelineRef}>
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
                  {monthLabels.map(month => {
                    const taskStart = task.startMonth || 1;
                    const taskEnd = task.endMonth || 1;
                    
                    // Each displayed month represents a 6-month period
                    // 6 = months 1-6, 12 = months 7-12, 18 = months 13-18, etc.
                    const getColumnStartMonth = (col) => col === 6 ? 1 : col - 5;
                    const getColumnEndMonth = (col) => col;
                    
                    const columnStart = getColumnStartMonth(month);
                    const columnEnd = getColumnEndMonth(month);
                    
                    // Check if this column overlaps with the task range
                    // A column is active if its range overlaps with the task range
                    const columnOverlapsTask = !(columnEnd < taskStart || columnStart > taskEnd);
                    
                    // Check if this is the start column (contains task start month)
                    const isStart = taskStart >= columnStart && taskStart <= columnEnd;
                    
                    // Check if this is the end column (contains task end month)
                    const isEnd = taskEnd >= columnStart && taskEnd <= columnEnd;
                    
                    return (
                      <div
                        key={month}
                        className={`gantt-month-cell ${columnOverlapsTask ? 'gantt-month-active' : ''} ${isStart ? 'gantt-month-start' : ''} ${isEnd ? 'gantt-month-end' : ''}`}
                      />
                    );
                  })}
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
        <div className="gantt-legend-item">
          <div className="gantt-legend-color gantt-legend-color-start"></div>
          <span>תחילת משימה</span>
        </div>
        <div className="gantt-legend-item">
          <div className="gantt-legend-color gantt-legend-color-end"></div>
          <span>סיום משימה</span>
        </div>
      </div>
    </div>
  );
};

export default GanttPreview;
