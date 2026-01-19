import React from 'react';

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

const AdditionalInfoSection = ({ researchData }) => {
  if (!researchData) return null;

  return (
    <>
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
    </>
  );
};

export default AdditionalInfoSection;
