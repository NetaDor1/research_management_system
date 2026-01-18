import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../services/firebase';
import './Page.css';
import './Research.css';

// Mapping of fund names to their URLs
const fundLinks = {
  'הקרן הלאומית למדע ISF - Israeli Science Foundation': 'https://www.isf.org.il/#/',
  'הקרן הדו-לאומית למדע BSF - Binational Science Foundation': 'https://www.bsf.org.il/',
  'הקרן הגרמנית-ישראלית למחקר ופיתוח GIF - German-Israeli Foundation': 'https://www.gif.org.il/',
  'האיחוד האירופי Horizon': 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/horizon-dashboard',
  'משרד החדשנות, המדע והטכנולוגיה MOST': 'https://www.gov.il/he/departments/ministry_of_science_and_technology/govil-landing-page',
  'משרד הבריאות MOH': 'https://www.gov.il/he/departments/units/office-of-the-chief-scientist/govil-landing-page',
  'המכון הלאומי לבריאות (ארה"ב) - NIH National Institute of Health': 'https://grants.nih.gov/',
  'הקרן לחקר הסרטן ICRF': 'https://www.icrfonline.org/',
  'הקרן הדו-לאומית למחקר ופיתוח חקלאי BARD': 'https://www.bard-isus.org/',
  'שיתוף פעולה גרמניה-ישראל DIP': 'https://www.internationales-buero.de/en/index.php',
  'הקרן הגרמנית למחקר DFG': 'https://www.dfg.de/en/about-us',
  'HFSP - Human Frontiers Science Project': 'https://www.hfsp.org/',
  'רשות המים - המדען הראשי': 'https://www.gov.il/he/pages/national_water_system',
  'רשות האנרגיה והתשתיות - המדען הראשי': 'https://www.gov.il/he/departments/ministry_of_energy/govil-landing-page',
  'המשרד לאיכות הסביבה - המדען הראשי': 'https://www.gov.il/he/departments/dynamiccollectors/research_sviva',
  'משרד החקלאות וההתיישבות הכפרית / מכון וולקני': 'https://www.agri.gov.il/he/home/default.aspx',
  'האגודה למלחמה בסרטן': 'https://www.cancer.org.il/',
  'אלו"ט': 'https://alut.org.il/',
  'קרן "שלם"': 'https://www.kshalem.org.il/',
  'Volfswagen Stiftung': 'https://www.volkswagenstiftung.de/en',
  'Spencer Foundation for Research in Education': 'https://www.spencer.org/',
  'קרן קיימת לישראל קק"ל': 'https://www.kkl.org.il/',
  'מו"פ מדבר יהודה וים המלח': 'https://www.adssc.org/',
  'המרכז למחקרי סביבה וקיימות': 'https://www.openu.ac.il/env-center/pages/default.aspx',
  'קרן פזי': 'https://www.pazyfoundation.org.il/',
  'מכון אלי הורביץ לניהול אסטרטגי': 'https://www.hurvitz-institute.tau.ac.il/',
  'מרכז לדאטה ובינה מלאכותית - אונ\' תל אביב': 'https://datascience.tau.ac.il/'
};

const ResearchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, userRole, user } = useAuth();
  const [researchData, setResearchData] = useState(null);
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
    const fetchResearch = async () => {
      if (!db) {
        setError('מסד הנתונים לא מאותחל');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const docRef = doc(db, 'researchProposals', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if user has permission to view this research
          if (userRole === 'RESEARCHER' && data.researcherId !== user?.id) {
            setError('אין הרשאה לצפות במחקר זה');
            setLoading(false);
            return;
          }

          setResearchData(data);
        } else {
          setError('המחקר לא נמצא');
        }
      } catch (err) {
        console.error('Error fetching research:', err);
        setError('שגיאה בטעינת פרטי המחקר');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResearch();
    }
  }, [id, userRole, user?.id]);

  // Fetch tasks
  useEffect(() => {
    if (!id || !db) return;

    const tasksRef = collection(db, 'researchProposals', id, 'tasks');
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
      case 'awarded':
        return 'זכייה';
      case 'pending':
        return 'המתנה';
      case 'rejected':
        return 'לא אושר';
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'awarded':
        return 'status-awarded';
      case 'pending':
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
    return '/research';
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

      const tasksRef = collection(db, 'researchProposals', id, 'tasks');
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
        const fileRef = ref(storage, `researchProposals/${id}/tasks/${taskId}/submissions/${timestamp}-${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadedFiles.push({
          name: file.name,
          url: url,
          uploadedAt: serverTimestamp()
        });
      }

      // Update task with submission
      const taskRef = doc(db, 'researchProposals', id, 'tasks', taskId);
      const taskDoc = await getDoc(taskRef);
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

      const taskRef = doc(db, 'researchProposals', id, 'tasks', editingTaskId);
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
      const taskRef = doc(db, 'researchProposals', id, 'tasks', taskId);
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
            <p>טוען פרטי מחקר...</p>
          </div>
        )}

        {error && (
          <div className="no-results" style={{ background: '#f8d7da', color: '#721c24' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && researchData && (
          <div style={{ direction: 'rtl', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ margin: 0, color: '#333' }}>פרטי מחקר</h1>
              {isAdmin() && (
                <button
                  onClick={() => {
                    // Navigate to new research form with edit mode
                    // For now, we'll use the new form - you can enhance this later to support edit mode
                    navigate(`/research/new?edit=${id}`);
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
                  ✏️ ערוך מחקר
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
                  <span style={{ fontSize: '16px' }}>{researchData.projectTitle || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    שם הקרן:
                  </label>
                  <div style={{ fontSize: '16px' }}>
                    <span>{researchData.fundName || 'לא צוין'}</span>
                    {researchData.fundName && fundLinks[researchData.fundName] && (
                      <div style={{ marginTop: '8px' }}>
                        <a 
                          href={fundLinks[researchData.fundName]} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            color: '#667eea',
                            textDecoration: 'none',
                            fontSize: '14px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                          onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                        >
                          🔗 קישור לאתר הקרן
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    סוג הקרן:
                  </label>
                  <span style={{ fontSize: '16px' }}>{researchData.fundType || 'לא צוין'}</span>
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
                  <span style={{ fontSize: '16px' }}>{researchData.submissionPath || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    סוג הגשה:
                  </label>
                  <span style={{ fontSize: '16px' }}>{researchData.submissionType || 'לא צוין'}</span>
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
                  <span style={{ fontSize: '16px' }}>{researchData.researcherRole || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    שלב ההצעה:
                  </label>
                  <span style={{ fontSize: '16px' }}>{researchData.proposalStage || 'לא צוין'}</span>
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
                  <span style={{ fontSize: '16px' }}>{researchData.researcherName || 'לא צוין'}</span>
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
                    className={`status-button ${getStatusClass(researchData.status)}`}
                    style={{ 
                      display: 'inline-block',
                      padding: '5px 15px',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    {getStatusLabel(researchData.status)}
                  </span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    יש פטנט:
                  </label>
                  <span style={{ fontSize: '16px' }}>{researchData.hasPatent ? 'כן' : 'לא'}</span>
                </div>
              </div>
            </div>

            {/* תקופת המחקר */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>תקופת המחקר</h2>
              
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
                    תאריך התחלה:
                  </label>
                  <span style={{ fontSize: '16px' }}>{formatDate(researchData.researchStartDate)}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    תאריך סיום:
                  </label>
                  <span style={{ fontSize: '16px' }}>{formatDate(researchData.researchEndDate)}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    משך המחקר (שנים):
                  </label>
                  <span style={{ fontSize: '16px' }}>{researchData.researchDurationYears || 'לא צוין'}</span>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '5px',
                    color: '#666'
                  }}>
                    שנה אקדמית:
                  </label>
                  <span style={{ fontSize: '16px' }}>{researchData.academicYear || 'לא צוין'}</span>
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
                    {formatCurrency(researchData.totalBudget, researchData.currency)}
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
                  <span style={{ fontSize: '16px' }}>{researchData.currency || 'ILS'}</span>
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
                    {formatCurrency(researchData.convertedBudget, 'ILS')}
                  </span>
                </div>
              </div>

              {researchData.budgetComponents && Object.keys(researchData.budgetComponents).length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ marginBottom: '15px', color: '#666' }}>רכיבי תקציב:</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px'
                  }}>
                    {Object.entries(researchData.budgetComponents).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '15px',
                        background: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}>
                        <span style={{ fontWeight: 'bold', color: '#666' }}>{key}:</span>
                        <span style={{ marginRight: '10px' }}>
                          {formatCurrency(value, researchData.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* שותפים */}
            {researchData.partners && researchData.partners.length > 0 && (
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
                  {researchData.partners.map((partner, index) => (
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
                      {partner.country && (
                        <div>
                          <label style={{ fontWeight: 'bold', color: '#666', marginLeft: '10px' }}>מדינה:</label>
                          <span>{partner.country}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* מידע נוסף */}
            <div style={{ 
              background: '#f9f9f9', 
              padding: '30px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#667eea' }}>מידע נוסף</h2>
              
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
                    תאריך תגובה צפוי:
                  </label>
                  <span style={{ fontSize: '16px' }}>
                    {formatDate(researchData.expectedResponseDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* הערות */}
            {researchData.notes && (
              <div style={{ 
                background: '#f9f9f9', 
                padding: '30px', 
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#667eea' }}>הערות</h2>
                <p style={{ fontSize: '16px', lineHeight: '1.6' }}>{researchData.notes}</p>
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

export default ResearchDetail;
