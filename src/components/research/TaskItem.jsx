import React, { useState } from 'react';
import FileDropZone from '../FileDropZone';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TaskForm from './TaskForm';

const TaskItem = ({ 
  task, 
  researchProposalId, 
  onEdit, 
  onDelete, 
  onUpdate,
  onSaveEdit,
  isEditing,
  editingTask,
  uploading,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const locale = language === 'en' ? 'en-US' : 'he-IL';
  const [fileUploading, setFileUploading] = useState(false);

  const formatDate = (timestamp) => {
    if (!timestamp) return t('notSpecified', 'לא צוין');
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString(locale);
      }
      if (timestamp && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString(locale);
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString(locale);
      }
      return String(timestamp);
    } catch (e) {
      return String(timestamp);
    }
  };

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
          uploadedAt: new Date().toISOString()
        });
      }

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

      if (inputElement) {
        inputElement.value = '';
      }

      alert(t('filesUploadedSuccess', 'הקבצים הועלו בהצלחה! המשימה עודכנה לסטטוס "הוגשה".'));
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error uploading files:', err);
      alert(`${t('uploadFilesError', 'שגיאה בהעלאת קבצים')}: ${err.message || ''}`);
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
        border: '1px solid #ddd',
        textAlign,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, marginBottom: '5px', color: '#333' }}>{task.title}</h3>
          {task.description && (
            <p style={{ margin: '5px 0', color: '#666' }}>{task.description}</p>
          )}
          <div style={{ fontSize: '14px', color: '#888', marginTop: '10px' }}>
            <span>{t('taskCreated', 'נוצרה')}: {formatDate(task.createdAt)}</span>
            {task.dueDate && (
              <span style={{ marginInlineStart: '15px' }}>
                {' '}| {t('dueDate', 'תאריך יעד')}: {formatDate(task.dueDate)}
              </span>
            )}
            {task.status === 'submitted' && task.submittedAt && (
              <span style={{ marginInlineStart: '15px' }}>
                {' '}| {t('taskSubmitted', 'הוגשה')}: {formatDate(task.submittedAt)}
              </span>
            )}
          </div>

          {task.attachments && task.attachments.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {task.attachments.map((file, idx) => (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '13px', color: '#667eea', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  📎 {file.name}
                </a>
              ))}
            </div>
          )}
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
            {task.status === 'submitted'
              ? t('taskStatusSubmitted', 'הוגשה')
              : t('taskStatusPending', 'ממתינה')}
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
                title={t('editTask', 'ערוך משימה')}
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
                title={t('deleteTask', 'מחק משימה')}
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>

      {!isAdmin && task.status === 'pending' && (
        <div style={{ marginTop: '15px', padding: '15px', background: '#f0f0f0', borderRadius: '4px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            {t('uploadFilesForSubmission', 'העלה קבצים להגשה (חובה)')}:
          </label>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
            {t('uploadFileToComplete', 'יש להעלות קובץ כדי לסמן את המשימה כהושלמה')}
          </p>
          <FileDropZone
            disabled={fileUploading}
            onFiles={async (files) => {
              await handleFileUpload(files);
            }}
          />
          {fileUploading && (
            <p style={{ color: '#667eea', fontWeight: 'bold', marginTop: '10px' }}>
              {t('uploadingFiles', 'מעלה קבצים...')}
            </p>
          )}
        </div>
      )}

      {task.submissions && task.submissions.length > 0 && (
        <div style={{ marginTop: '15px', padding: '15px', background: '#e8f5e9', borderRadius: '4px' }}>
          <h4 style={{ margin: 0, marginBottom: '10px', color: '#2e7d32' }}>
            {t('submittedFiles', 'קבצים שהוגשו')}:
          </h4>
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
                  <span style={{ marginInlineStart: '10px', fontSize: '12px', color: '#666' }}>
                    ({formatDate(file.uploadedAt)})
                  </span>
                )}
              </li>
            ))}
          </ul>
          {!isAdmin && (
            <div style={{ marginTop: '12px', borderTop: '1px solid #c8e6c9', paddingTop: '12px' }}>
              <FileDropZone
                variant="compact"
                disabled={fileUploading}
                label={fileUploading
                  ? t('uploading', 'מעלה...')
                  : t('addFiles', 'הוסף קבצים')}
                onFiles={async (files) => {
                  await handleFileUpload(files);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskItem;
