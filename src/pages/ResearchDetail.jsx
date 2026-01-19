import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import ResearchInfoSection from '../components/research/ResearchInfoSection';
import ResearchPeriodSection from '../components/research/ResearchPeriodSection';
import BudgetSection from '../components/research/BudgetSection';
import PartnersSection from '../components/research/PartnersSection';
import ResearchDescriptionSection from '../components/research/ResearchDescriptionSection';
import AdditionalInfoSection from '../components/research/AdditionalInfoSection';
import TasksSection from '../components/research/TasksSection';
import './Page.css';
import './Research.css';

const ResearchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, userRole, user } = useAuth();
  const [researchData, setResearchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [uploading, setUploading] = useState(false);

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
        setTasks(sortedTasks);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
        if (error.code !== 'permission-denied') {
          console.error('Tasks fetch error:', error.message);
        }
      }
    );

    return () => unsubscribe();
  }, [id]);

  const getBackPath = () => {
    if (userRole === 'RESEARCHER') {
      return '/';
    }
    return '/research';
  };

  // Handle adding a new task
  const handleAddTask = async (formData) => {
    if (!isAdmin() || !id || !db) {
      console.error('Cannot add task: Missing admin permission, id, or db');
      return;
    }

    setUploading(true);
    try {
      // Get research proposal data to extract researcherId
      const researchDoc = await getDoc(doc(db, 'researchProposals', id));
      if (!researchDoc.exists()) {
        alert('הצעת המחקר לא נמצאה');
        setUploading(false);
        return;
      }
      const researchData = researchDoc.data();
      const researcherId = researchData.researcherId;

      if (!researcherId) {
        alert('לא נמצא מזהה חוקר בהצעת המחקר');
        setUploading(false);
        return;
      }

      console.log('Adding task for researcher:', researcherId);

      // Convert dueDate string to Timestamp if provided
      let dueDateTimestamp = null;
      let dueDateString = null;
      if (formData.dueDate) {
        try {
          const dueDate = new Date(formData.dueDate);
          dueDateTimestamp = Timestamp.fromDate(dueDate);
          dueDateString = formData.dueDate; // Keep as YYYY-MM-DD for calendar
          console.log('Task due date:', dueDateString);
        } catch (e) {
          console.error('Error converting dueDate:', e);
        }
      }

      // Prepare task data for subcollection
      const taskData = {
        title: formData.title,
        description: formData.description || '',
        dueDate: dueDateTimestamp,
        createdAt: serverTimestamp(),
        createdBy: user?.name || 'Admin',
        status: 'pending',
        submissions: []
      };

      // Save task in research proposal subcollection
      const tasksRef = collection(db, 'researchProposals', id, 'tasks');
      const taskDocRef = await addDoc(tasksRef, taskData);
      const taskId = taskDocRef.id;
      console.log('✅ Task saved to subcollection with ID:', taskId);

      // Also save to global tasks collection for calendar (only if dueDate exists)
      // Note: This might fail due to Firestore security rules - task is already saved in subcollection
      if (dueDateString) {
        try {
          const globalTaskData = {
            id: taskId,
            title: formData.title,
            dueDate: dueDateString, // YYYY-MM-DD format for calendar
            status: 'open', // 'open' for pending tasks
            researcherId: researcherId,
            researchProposalId: id, // Link back to research proposal
            createdAt: serverTimestamp()
          };

          const globalTasksRef = collection(db, 'tasks');
          const globalTaskDocRef = await addDoc(globalTasksRef, globalTaskData);
          console.log('✅ Task saved to global tasks collection for calendar:', {
            globalTaskId: globalTaskDocRef.id,
            taskId,
            dueDate: dueDateString,
            researcherId
          });
        } catch (globalTaskError) {
          // Task is already saved in subcollection, so we don't fail the whole operation
          console.warn('⚠️ Failed to save task to global tasks collection (calendar):', globalTaskError.message);
          console.warn('Task is still saved in subcollection and will be visible in research proposal');
          console.warn('To fix: Update Firestore security rules to allow write to "tasks" collection');
          // Don't throw - task is already saved successfully in subcollection
        }
      } else {
        console.log('⚠️ Task has no dueDate, skipping calendar collection (task still saved in subcollection)');
      }

      alert('המשימה נוספה בהצלחה!');
    } catch (err) {
      console.error('❌ Error adding task:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      alert(`שגיאה בהוספת משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle editing a task
  const handleEditTask = async (taskId, formData) => {
    if (!isAdmin() || !id || !db || !taskId) return;

    setUploading(true);
    try {
      let dueDateTimestamp = null;
      let dueDateString = null;
      if (formData.dueDate) {
        try {
          const dueDate = new Date(formData.dueDate);
          dueDateTimestamp = Timestamp.fromDate(dueDate);
          dueDateString = formData.dueDate;
        } catch (e) {
          console.error('Error converting dueDate:', e);
        }
      }

      const taskRef = doc(db, 'researchProposals', id, 'tasks', taskId);
      await updateDoc(taskRef, {
        title: formData.title,
        description: formData.description || '',
        dueDate: dueDateTimestamp,
        updatedAt: serverTimestamp()
      });

      if (dueDateString) {
        const globalTasksQuery = query(
          collection(db, 'tasks'),
          where('id', '==', taskId)
        );
        const globalTasksSnapshot = await getDocs(globalTasksQuery);
        if (!globalTasksSnapshot.empty) {
          const globalTaskDoc = globalTasksSnapshot.docs[0];
          await updateDoc(globalTaskDoc.ref, {
            title: formData.title,
            dueDate: dueDateString
          });
        }
      }

      alert('המשימה עודכנה בהצלחה!');
    } catch (err) {
      console.error('Error updating task:', err);
      alert(`שגיאה בעדכון משימה: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId) => {
    if (!isAdmin() || !id || !db || !taskId) return;

    if (!window.confirm('האם אתה בטוח שברצונך למחוק את המשימה הזו?')) {
      return;
    }

    setUploading(true);
    try {
      const taskRef = doc(db, 'researchProposals', id, 'tasks', taskId);
      await deleteDoc(taskRef);

      const globalTasksQuery = query(
        collection(db, 'tasks'),
        where('id', '==', taskId)
      );
      const globalTasksSnapshot = await getDocs(globalTasksQuery);
      if (!globalTasksSnapshot.empty) {
        const globalTaskDoc = globalTasksSnapshot.docs[0];
        await deleteDoc(globalTaskDoc.ref);
      }

      alert('המשימה נמחקה בהצלחה!');
    } catch (err) {
      console.error('Error deleting task:', err);
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
                  onClick={() => navigate(`/research/new?edit=${id}`)}
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

            <ResearchInfoSection researchData={researchData} />
            <ResearchPeriodSection researchData={researchData} />
            <BudgetSection researchData={researchData} />
            <PartnersSection researchData={researchData} />
            <ResearchDescriptionSection researchData={researchData} />
            <AdditionalInfoSection researchData={researchData} />
            <TasksSection
              tasks={tasks}
              researchProposalId={id}
              isAdmin={isAdmin()}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onSaveEditTask={handleEditTask}
              uploading={uploading}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchDetail;
