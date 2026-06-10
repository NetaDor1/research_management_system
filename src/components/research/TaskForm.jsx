import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import FileDropZone from '../FileDropZone';

const TaskForm = ({ 
  task, 
  onSave, 
  onCancel, 
  loading 
}) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const [formData, setFormData] = React.useState({
    title: task?.title || '',
    description: task?.description || '',
    dueDate: task?.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate().toISOString().split('T')[0] : '') : '',
    files: [],
    existingAttachments: task?.attachments || []
  });

  React.useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        dueDate: task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate().toISOString().split('T')[0] : '') : '',
        files: [],
        existingAttachments: task.attachments || []
      });
    }
  }, [task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert(t('enterTaskTitleAlert', 'אנא הזן כותרת למשימה'));
      return;
    }
    onSave(formData);
  };

  const handleFilesSelected = (selected) => {
    setFormData(prev => ({ ...prev, files: [...prev.files, ...selected] }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  return (
    <div style={{
      background: '#fff',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '2px solid #667eea',
      textAlign,
    }}>
      <h3 style={{ marginBottom: '15px' }}>
        {task
          ? t('editTaskTitle', 'עריכת משימה')
          : t('addNewTaskTitle', 'הוספת משימה חדשה')}
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            {t('taskTitleRequired', 'כותרת המשימה')}: *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
            placeholder={t('enterTaskTitle', 'הזן כותרת למשימה')}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            {t('description', 'תיאור')}:
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px', minHeight: '100px', resize: 'vertical' }}
            placeholder={t('enterTaskDescription', 'הזן תיאור למשימה')}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            {t('dueDate', 'תאריך יעד')}:
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            {t('attachedFiles', 'קבצים מצורפים')}:
          </label>

          {formData.existingAttachments.length > 0 && (
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {formData.existingAttachments.map((file, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '6px 10px' }}>
                  <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#667eea', textDecoration: 'none' }}>
                    📎 {file.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, existingAttachments: prev.existingAttachments.filter((_, i) => i !== idx) }))}
                    style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    {t('remove', 'הסר')}
                  </button>
                </div>
              ))}
            </div>
          )}

          <FileDropZone
            variant="compact"
            disabled={loading}
            label={t('addFiles', 'הוסף קבצים')}
            onFiles={handleFilesSelected}
          />

          {formData.files.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {formData.files.map((file, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
                  <span style={{ fontSize: '13px', color: '#444' }}>📄 {file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    {t('remove', 'הסר')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={loading || !formData.title.trim()}
            style={{
              padding: '10px 20px',
              background: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {loading
              ? t('saving', 'שומר...')
              : (task ? t('saveChanges', 'שמור שינויים') : t('saveTask', 'שמור משימה'))}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {t('cancel', 'ביטול')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TaskForm;
