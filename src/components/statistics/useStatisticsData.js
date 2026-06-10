import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useLanguage } from '../../context/LanguageContext';
import { toDateString } from './utils';
import { isSubmitted } from '../../utils/submissionStatus';

export const useStatisticsData = (userRole, userId) => {
  const { t } = useLanguage();
  const [researchData, setResearchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResearch = async () => {
      if (!db) {
        console.error('Firestore database not initialized');
        setError(t('dbNotInitialized', 'מסד הנתונים לא מאותחל'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      
      try {
        const researchRef = collection(db, 'researchProposals');
        let querySnapshot;

        if (userRole === 'RESEARCHER' && userId) {
          try {
            const q = query(
              researchRef,
              where('researcherId', '==', userId),
              orderBy('createdAt', 'desc')
            );
            querySnapshot = await getDocs(q);
          } catch (orderByError) {
            const q = query(
              researchRef,
              where('researcherId', '==', userId)
            );
            querySnapshot = await getDocs(q);
          }
        } else {
          try {
            const q = query(researchRef, orderBy('createdAt', 'desc'));
            querySnapshot = await getDocs(q);
          } catch (orderByError) {
            querySnapshot = await getDocs(researchRef);
          }
        }

        const visibleDocs = userRole === 'ADMIN'
          ? querySnapshot.docs.filter((docItem) => isSubmitted(docItem.data()))
          : querySnapshot.docs;

        const researchList = visibleDocs.map((doc) => {
          const data = doc.data();
          
          return {
            id: doc.id,
            title: data.projectTitle || data.title || t('noTitle', 'ללא כותרת'),
            researcherName: data.researcherName || data.researcher || t('researcher', 'חוקר'),
            researcherId: data.researcherId,
            status: data.status || 'pending',
            hasPatent: data.hasPatent || false,
            submissionDate: toDateString(data.submissionDate || data.createdAt),
            fundName: data.fundName || '',
            academicYear: data.academicYear || '',
            researchStartDate: toDateString(data.researchStartDate),
            researchEndDate: toDateString(data.researchEndDate),
            department: data.department || '',
          };
        });

        setResearchData(researchList);
      } catch (err) {
        console.error('Error fetching research:', err);
        setError(t('loadStatisticsError', 'שגיאה בטעינת נתונים'));
        setResearchData([]);
      } finally {
        setLoading(false);
      }
    };

    if (userRole && userId) {
      fetchResearch();
    }
  }, [userRole, userId, t]);

  return { researchData, loading, error };
};
