import React, { useState } from 'react';
import TaskForm from './TaskForm';
import TaskItem from './TaskItem';

const TasksSection = ({ 
  tasks, 
  researchProposalId, 
  isAdmin, 
  onAddTask, 
  onDeleteTask,
  onSaveEditTask,
  uploading 
}) => {
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const handleAddTask = (formData) => {
    onAddTask(formData);
    setShowAddTask(false);
  };

  const handleEditTask = (task) => {
    if (task) {
      setEditingTaskId(task.id);
      setEditingTask(task);
    } else {
      setEditingTaskId(null);
      setEditingTask(null);
    }
  };

  const handleSaveEdit = (formData) => {
    onSaveEditTask(editingTaskId, formData);
    setEditingTaskId(null);
    setEditingTask(null);
  };

  return (
    <div style={{ 
      background: '#f9f9f9', 
      padding: '30px', 
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#667eea' }}>משימות והגשות</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showAddTask ? '✖️ ביטול' : '➕ הוסף משימה'}
          </button>
        )}
      </div>

      {/* Form to add new task (admin only) */}
      {isAdmin && showAddTask && (
        <TaskForm
          onSave={handleAddTask}
          onCancel={() => setShowAddTask(false)}
          loading={uploading}
        />
      )}

      {/* Tasks list */}
      {tasks.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          {isAdmin ? 'אין משימות. הוסף משימה חדשה.' : 'אין משימות להצגה.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              researchProposalId={researchProposalId}
              isEditing={editingTaskId === task.id}
              editingTask={editingTask}
              onEdit={isAdmin ? handleEditTask : null}
              onDelete={isAdmin ? onDeleteTask : null}
              onSaveEdit={handleSaveEdit}
              onUpdate={() => {}}
              uploading={uploading}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksSection;
