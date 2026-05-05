import React from 'react';
import { normalizeAcademicYear } from '../../utils/academicYear';

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

const ResearchPeriodSection = ({ researchData }) => {
  if (!researchData) return null;
  const displayAcademicYear = normalizeAcademicYear(
    researchData.academicYear,
    researchData.researchStartDate
  );

  return (
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
          <span style={{ fontSize: '16px' }}>{displayAcademicYear || 'לא צוין'}</span>
        </div>
      </div>
    </div>
  );
};

export default ResearchPeriodSection;
