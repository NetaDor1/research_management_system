import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TaskForm from './TaskForm';

const formatDate = (timestamp) => {
  if (!timestamp) return 'לא צוין';
  try {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('he-IL');
    }
    if (timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('he-IL');
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleDateString('he-IL');
    }
    return String(timestamp);
  } catch (e) {
    return String(timestamp);
  }
};

const TaskItem = ({ 
  task, 
  researchProposalId, 
  onEdit, 
  onDelete, 
  onUpdate,
  onSaveEdit,
  isEditing,
  editingTask,
  uploading 
}) => {
  const { user } = useAuth();
  const [fileUploading, setFileUploading] = useState(false);

  const handleFileUpload = async (files, inputElement) => {
    if (!researchProposalId || !task.id || !files || files.length === 0) return;

    setFileUploading(true);
    try {
      const uploadedFiles = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Date.now();
        const fileRef = ref(storage, `researchProposals/${researchProposalId}/tasks/${task.id}/submissions/${timestamp}-${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadedFiles.push({
          name: file.name,
          url: url,
          uploadedAt: serverTimestamp()
        });
      }

      // Update task with submission
      const taskRef = doc(db, 'researchProposals', researchProposalId, 'tasks', task.id);
      const taskDoc = await getDoc(taskRef);
      const existingSubmissions = taskDoc.data()?.submissions || [];
      
      const updatedSubmissions = [...existingSubmissions, ...uploadedFiles];
      
      await updateDoc(taskRef, {
        submissions: updatedSubmissions,
        status: 'submitted',
        submittedAt: serverTimestamp(),
        submittedBy: user?.name || 'Researcher'
      });

      // Update global tasks collection - mark as done
      const globalTasksQuery = query(
        collection(db, 'tasks'),
        where('id', '==', task.id)
      );
      const globalTasksSnapshot = await getDocs(globalTasksQuery);
      if (!globalTasksSnapshot.empty) {
        const globalTaskDoc = globalTasksSnapshot.docs[0];
        await updateDoc(globalTaskDoc.ref, {
          status: 'done'
        });
      }

      // Reset the file input
      if (inputElement) {
        inputElement.value = '';
      }

      alert('הקבצים הועלו בהצלחה! המשימה עודכנה לסטטוס "הוגשה".');
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error uploading files:', err);
      alert(`שגיאה בהעלאת קבצים: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setFileUploading(false);
    }
  };

  if (isEditing && editingTask) {
    return (
      <TaskForm
        task={editingTask}
        onSave={onSaveEdit}
        onCancel={() => onEdit(null)}
        loading={uploading}
      />
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, marginBottom: '5px', color: '#333' }}>{task.title}</h3>
          {task.description && (
            <p style={{ margin: '5px 0', color: '#666' }}>{task.description}</p>
          )}
          <div style={{ fontSize: '14px', color: '#888', marginTop: '10px' }}>
            <span>נוצרה: {formatDate(task.createdAt)}</span>
            {task.dueDate && (
              <span style={{ marginRight: '15px' }}> | תאריך יעד: {formatDate(task.dueDate)}</span>
            )}
            {task.status === 'submitted' && task.submittedAt && (
              <span style={{ marginRight: '15px' }}> | הוגשה: {formatDate(task.submittedAt)}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
          <span
            className={`status-button ${task.status === 'submitted' ? 'status-awarded' : 'status-pending'}`}
            style={{
              padding: '5px 15px',
              borderRadius: '4px',
              fontSize: '14px',
              whiteSpace: 'nowrap'
            }}
          >
            {task.status === 'submitted' ? 'הוגשה' : 'ממתינה'}
          </span>
          {onEdit && onDelete && (
            <div style={{ display: 'flex', gap: '3px', opacity: 0.5, transition: 'opacity 0.2s' }} 
                 onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} 
                 onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}>
              <button
                onClick={() => onEdit(task)}
                disabled={uploading}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  color: '#667eea',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: uploading ? 0.5 : 1
                }}
                title="ערוך משימה"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(task.id)}
                disabled={uploading}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  color: '#999',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: uploading ? 0.5 : 1
                }}
                title="מחק משימה"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File upload for researcher */}
      {!onEdit && task.status === 'pending' && (
        <div style={{ marginTop: '15px', padding: '15px', background: '#f0f0f0', borderRadius: '4px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            העלה קבצים להגשה:
          </label>
          <input
            type="file"
            multiple
            onChange={async (e) => {
              if (e.target.files && e.target.files.length > 0) {
                await handleFileUpload(Array.from(e.target.files), e.target);
              }
            }}
            disabled={fileUploading}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
          {fileUploading && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ color: '#667eea', fontWeight: 'bold' }}>מעלה קבצים...</p>
            </div>
          )}
        </div>
      )}

      {/* Show submitted files */}
      {task.submissions && task.submissions.length > 0 && (
        <div style={{ marginTop: '15px', padding: '15px', background: '#e8f5e9', borderRadius: '4px' }}>
          <h4 style={{ margin: 0, marginBottom: '10px', color: '#2e7d32' }}>קבצים שהוגשו:</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {task.submissions.map((file, idx) => (
              <li key={idx} style={{ marginBottom: '8px' }}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#667eea',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  📄 {file.name}
                </a>
                {file.uploadedAt && (
                  <span style={{ marginRight: '10px', fontSize: '12px', color: '#666' }}>
                    ({formatDate(file.uploadedAt)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TaskItem;
