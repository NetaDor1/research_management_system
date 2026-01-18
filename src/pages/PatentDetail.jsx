import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, getDoc as getDocTask, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../services/firebase';
import './Page.css';
import './Research.css';

const PatentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, userRole, user } = useAuth();
  const [patentData, setPatentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tasks and submissions state
  const [tasks, setTasks] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', files: [] });
  const [uploading, setUploading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTask, setEditTask] = useState({ title: '', description: '', dueDate: '' });

  useEffect(() => {
    const fetchPatent = async () => {
      if (!db) {
        setError('מסד הנתונים לא מאותחל');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const docRef = doc(db, 'patents', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if user has permission to view this patent
          if (userRole === 'RESEARCHER' && data.researcherId !== user?.id) {
            setError('אין הרשאה לצפות בפטנט זה');
            setLoading(false);
            return;
          }

          setPatentData(data);
        } else {
          setError('הפטנט לא נמצא');
        }
      } catch (err) {
        console.error('Error fetching patent:', err);
        setError('שגיאה בטעינת פרטי הפטנט');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPatent();
    }
  }, [id, userRole, user?.id]);

  // Fetch tasks
  useEffect(() => {
    if (!id || !db) return;

    const tasksRef = collection(db, 'patents', id, 'tasks');
    const unsubscribe = onSnapshot(
      tasksRef, 
      (snapshot) => {
        const tasksList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const sortedTasks = tasksList.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        console.log('Tasks updated:', sortedTasks.length, 'tasks');
        setTasks(sortedTasks);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
        // Don't show alert for permission errors - might be normal if rules not set up yet
        if (error.code !== 'permission-denied') {
          console.error('Tasks fetch error:', error.message);
        }
      }
    );

    return () => unsubscribe();
  }, [id]);

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

  const formatCurrency = (amount, currency = 'ILS') => {
    if (!amount) return 'לא צוין';
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
    return `${currencySymbol} ${Number(amount).toLocaleString('he-IL')}`;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'registered':
        return 'רשום';
      case 'approved':
        return 'אושר';
      case 'in-process':
        return 'בהליך';
      case 'rejected':
        return 'נדחה';
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'registered':
        return 'status-awarded';
      case 'approved':
        return 'status-awarded';
      case 'in-process':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const getBackPath = () => {
    if (userRole === 'RESEARCHER') {
      return '/';
    }
    return '/patents';
  };

  // Handle adding a new task (admin only)
  const handleAddTask = async () => {
    if (!isAdmin() || !id || !db) return;

    if (!newTask.title.trim()) {
      alert('אנא הזן כותרת למשימה');
      return;
    }

    setUploading(true);
    try {
      // Convert dueDate string to Timestamp if provided
      let dueDateTimestamp = null;
      if (newTask.dueDate) {
        try {
          dueDateTimestamp = Timestamp.fromDate(new Date(newTask.dueDate));
        } catch (e) {
          console.error('Error converting dueDate:', e);
        }
      }

      const taskData = {
        title: newTask.title,
        description: newTask.description || '',
        dueDate: dueDateTimestamp,
        createdAt: serverTimestamp(),
        createdBy: user?.name || 'Admin',
        status: 'pending',
        submissions: []
      };

      const tasksRef = collection(db, 'patents', id, 'tasks');
      await addDoc(tasksRef, taskData);

      setNewTask({ title: '', description: '', dueDate: '', files: [] });
      setShowAddTask(false);
      alert('המשימה נוספה בהצלחה!');
    } catch (err) {
      console.error('Error adding task:', err);
      console.error('Error details:', err.message);
      alert(`שגיאה בהוספת משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle file upload for task submission (researcher)
  const handleFileUpload = async (taskId, files, inputElement) => {
    if (!id || !taskId || !files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFiles = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Date.now();
        const fileRef = ref(storage, `patents/${id}/tasks/${taskId}/submissions/${timestamp}-${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadedFiles.push({
          name: file.name,
          url: url,
          uploadedAt: serverTimestamp()
        });
      }

      // Update task with submission
      const taskRef = doc(db, 'patents', id, 'tasks', taskId);
      const taskDoc = await getDocTask(taskRef);
      const existingSubmissions = taskDoc.data()?.submissions || [];
      
      const updatedSubmissions = [...existingSubmissions, ...uploadedFiles];
      console.log('Updating task with submissions:', updatedSubmissions.length, 'files');
      
      await updateDoc(taskRef, {
        submissions: updatedSubmissions,
        status: 'submitted',
        submittedAt: serverTimestamp(),
        submittedBy: user?.name || 'Researcher'
      });

      console.log('Task updated successfully');

      // Reset the file input
      if (inputElement) {
        inputElement.value = '';
      }

      // The onSnapshot will automatically update the UI, but we show a success message
      alert('הקבצים הועלו בהצלחה! המשימה עודכנה לסטטוס "הוגשה".');
    } catch (err) {
      console.error('Error uploading files:', err);
      console.error('Error details:', err.message);
      alert(`שגיאה בהעלאת קבצים: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle editing a task (admin only)
  const handleEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditTask({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate().toISOString().split('T')[0] : '') : ''
    });
  };

  // Handle saving edited task (admin only)
  const handleSaveEditTask = async () => {
    if (!isAdmin() || !id || !db || !editingTaskId) return;

    if (!editTask.title.trim()) {
      alert('אנא הזן כותרת למשימה');
      return;
    }

    setUploading(true);
    try {
      // Convert dueDate string to Timestamp if provided
      let dueDateTimestamp = null;
      if (editTask.dueDate) {
        try {
          dueDateTimestamp = Timestamp.fromDate(new Date(editTask.dueDate));
        } catch (e) {
          console.error('Error converting dueDate:', e);
        }
      }

      const taskRef = doc(db, 'patents', id, 'tasks', editingTaskId);
      await updateDoc(taskRef, {
        title: editTask.title,
        description: editTask.description || '',
        dueDate: dueDateTimestamp,
        updatedAt: serverTimestamp()
      });

      setEditingTaskId(null);
      setEditTask({ title: '', description: '', dueDate: '' });
      alert('המשימה עודכנה בהצלחה!');
    } catch (err) {
      console.error('Error updating task:', err);
      console.error('Error details:', err.message);
      alert(`שגיאה בעדכון משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle deleting a task (admin only)
  const handleDeleteTask = async (taskId) => {
    if (!isAdmin() || !id || !db || !taskId) return;

    if (!window.confirm('האם אתה בטוח שברצונך למחוק את המשימה הזו?')) {
      return;
    }

    setUploading(true);
    try {
      const taskRef = doc(db, 'patents', id, 'tasks', taskId);
      await deleteDoc(taskRef);
      alert('המשימה נמחקה בהצלחה!');
    } catch (err) {
      console.error('Error deleting task:', err);
      console.error('Error details:', err.message);
      alert(`שגיאה במחיקת משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <button 
          onClick={() => navigate(getBackPath())}
          style={{
            marginBottom: '20px',
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ← חזרה
        </button>

        {loading && (
          <div className="no-results">
            <p>טוען פרטי פטנט...</p>
          </div>
        )}

        {error && (
          <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && patentData && (
          <div style={{ direction: 'rtl', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, color: '#333' }}>פרטי פטנט</h1>
              {isAdmin() && (
                <button
                  onClick={() => {
                    // Navigate to new patent form with edit mode
                    // For now, we'll use the new form - you can enhance this later to support edit mode
                    navigate(`/patents/new?edit=${id}`);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  ✏️ ערוך פטנט
                </button>
              )}
            </div>

            {/* פרטים כלליים */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>פרטים כלליים</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    כותרת הפרויקט:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.projectTitle || patentData.title || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    אחוז המוסד:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.institutionPercentage || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    מסלול הגשה:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.submissionPath || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תפקיד החוקר:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.researcherRole || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    חוקר:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.researcherName || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    סטטוס:
                  </label>
                  <span 
                    className={`status-button ${getStatusClass(patentData.status)}`}
                    style={{ 
                      display: 'inline-block',
                      padding: '5px 15px',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    {getStatusLabel(patentData.status)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    שלב הפטנט:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.patentStage || 'לא צוין'}</span>
                </div>
              </div>
            </div>

            {/* יחידת מסחור */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>יחידת מסחור</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    יחידת מסחור:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationUnit || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    איש קשר 1:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationContact1 || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    אימייל 1:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationEmail1 || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    איש קשר 2:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationContact2 || 'לא צוין'}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    אימייל 2:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {patentData.commercializationEmail2 || 'לא צוין'}
                  </span>
                </div>
              </div>
            </div>

            {/* תאריכים */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>תאריכים</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך הגשת הבקשה:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.submissionDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך בדיקה ראשונית:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.initialReviewDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך בחינה:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.examinationDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך אישור:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.approvalDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך רישום:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.registrationDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך פרסום:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.publicationDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך חידוש:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.renewalDate)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך תפוגה:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(patentData.expiryDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* תקציב */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>תקציב</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תקציב כולל:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatCurrency(patentData.totalBudget, patentData.currency)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    מטבע:
                  </label>
                  <span style={{ fontSize: '16px' }}>{patentData.currency || 'ILS'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תקציב מומר:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatCurrency(patentData.convertedBudget, 'ILS')}
                  </span>
                </div>
              </div>

              {patentData.stageBudgets && Object.keys(patentData.stageBudgets).length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ marginBottom: '15px', color: '#666' }}>תקציב לפי שלבים:</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px'
                  }}>
                    {Object.entries(patentData.stageBudgets).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '15px',
                        background: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}>
                        <span style={{ fontWeight: 'bold', color: '#666' }}>{key}:</span>
                        <span style={{ marginRight: '10px' }}>
                          {formatCurrency(value, patentData.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* שותפים */}
            {patentData.partners && patentData.partners.length > 0 && (
              <div style={{ 
                background: '#f9f9f9', 
                padding: '30px', 
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>שותפים</h2>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {patentData.partners.map((partner, index) => (
                    <div key={index} style={{
                      padding: '20px',
                      background: '#fff',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>שם:</label>
                        <span>{partner.name || 'לא צוין'}</span>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>אימייל:</label>
                        <span>{partner.email || 'לא צוין'}</span>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>מוסד:</label>
                        <span>{partner.institution || 'לא צוין'}</span>
                      </div>
                      {partner.percentage && (
                        <div>
                          <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>אחוז:</label>
                          <span>{partner.percentage}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* הערות */}
            {patentData.notes && (
              <div style={{ 
                background: '#f9f9f9', 
                padding: '30px', 
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>הערות</h2>
                <p style={{ fontSize: '16px', lineHeight: '1.6' }}>{patentData.notes}</p>
              </div>
            )}

            {/* משימות והגשות */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#667eea' }}>משימות והגשות</h2>
                {isAdmin() && (
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
              {isAdmin() && showAddTask && (
                <div style={{
                  background: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '2px solid #667eea'
                }}>
                  <h3 style={{ marginBottom: '15px' }}>הוספת משימה חדשה</h3>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      כותרת המשימה: *
                    </label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '16px'
                      }}
                      placeholder="הזן כותרת למשימה"
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      תיאור:
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '16px',
                        minHeight: '100px',
                        resize: 'vertical'
                      }}
                      placeholder="הזן תיאור למשימה"
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      תאריך יעד:
                    </label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <button
                    onClick={handleAddTask}
                    disabled={uploading || !newTask.title.trim()}
                    style={{
                      padding: '10px 20px',
                      background: uploading ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    {uploading ? 'שומר...' : 'שמור משימה'}
                  </button>
                </div>
              )}

              {/* Tasks list */}
              {tasks.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  {isAdmin() ? 'אין משימות. הוסף משימה חדשה.' : 'אין משימות להצגה.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        background: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          {editingTaskId === task.id ? (
                            // Edit mode
                            <div>
                              <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                  כותרת המשימה: *
                                </label>
                                <input
                                  type="text"
                                  value={editTask.title}
                                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    fontSize: '16px'
                                  }}
                                  placeholder="הזן כותרת למשימה"
                                />
                              </div>
                              <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                  תיאור:
                                </label>
                                <textarea
                                  value={editTask.description}
                                  onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    fontSize: '16px',
                                    minHeight: '100px',
                                    resize: 'vertical'
                                  }}
                                  placeholder="הזן תיאור למשימה"
                                />
                              </div>
                              <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                  תאריך יעד:
                                </label>
                                <input
                                  type="date"
                                  value={editTask.dueDate}
                                  onChange={(e) => setEditTask({ ...editTask, dueDate: e.target.value })}
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    fontSize: '16px'
                                  }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                  onClick={handleSaveEditTask}
                                  disabled={uploading || !editTask.title.trim()}
                                  style={{
                                    padding: '10px 20px',
                                    background: uploading ? '#ccc' : '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {uploading ? 'שומר...' : 'שמור שינויים'}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingTaskId(null);
                                    setEditTask({ title: '', description: '', dueDate: '' });
                                  }}
                                  disabled={uploading}
                                  style={{
                                    padding: '10px 20px',
                                    background: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  ביטול
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <>
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
                            </>
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
                            {task.status === 'submitted' ? 'הוגשה' : 'ממתינה'}
                          </span>
                          {isAdmin() && editingTaskId !== task.id && (
                            <div style={{ display: 'flex', gap: '3px', opacity: 0.5, transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}>
                              <button
                                onClick={() => handleEditTask(task)}
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
                                onClick={() => handleDeleteTask(task.id)}
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
                      {!isAdmin() && task.status === 'pending' && (
                        <div style={{ marginTop: '15px', padding: '15px', background: '#f0f0f0', borderRadius: '4px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                            העלה קבצים להגשה:
                          </label>
                          <input
                            type="file"
                            multiple
                            onChange={async (e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                await handleFileUpload(task.id, Array.from(e.target.files), e.target);
                              }
                            }}
                            disabled={uploading}
                            style={{
                              width: '100%',
                              padding: '10px',
                              borderRadius: '4px',
                              border: '1px solid #ddd',
                              fontSize: '14px'
                            }}
                          />
                          {uploading && (
                            <div style={{ marginTop: '10px' }}>
                              <p style={{ color: '#667eea', fontWeight: 'bold' }}>מעלה קבצים...</p>
                              <div style={{ 
                                width: '100%', 
                                height: '4px', 
                                background: '#e0e0e0', 
                                borderRadius: '2px',
                                marginTop: '5px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: '100%',
                                  height: '100%',
                                  background: '#667eea',
                                  animation: 'pulse 1.5s ease-in-out infinite'
                                }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show submitted files (both admin and researcher) */}
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
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatentDetail;
