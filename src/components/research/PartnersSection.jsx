import React from 'react';

const PartnersSection = ({ researchData }) => {
  if (!researchData || !researchData.partners || researchData.partners.length === 0) {
    return null;
  }

  return (
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
  );
};

export default PartnersSection;
