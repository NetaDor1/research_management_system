import React from 'react';

const ResearchDescriptionSection = ({ researchData }) => {
  if (!researchData) return null;

  const hasDescriptionData = 
    researchData.abstract ||
    researchData.scientificBackground ||
    researchData.researchObjectives ||
    researchData.detailedDescription ||
    researchData.significanceInnovation ||
    researchData.applicability;

  if (!hasDescriptionData) return null;

  return (
    <div style={{ 
      background: '#f9f9f9', 
      padding: '30px', 
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h2 style={{ marginBottom: '20px', color: '#667eea' }}>תיאור המחקר</h2>
      
      {researchData.abstract && (
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ 
            marginBottom: '10px', 
            color: '#495057',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Abstract - תקציר
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            background: '#fff',
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            {researchData.abstract}
          </p>
        </div>
      )}

      {researchData.scientificBackground && (
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ 
            marginBottom: '10px', 
            color: '#495057',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Scientific background and state of the art - רקע מדעי ומצב טכנולוגי חדש
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            background: '#fff',
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            {researchData.scientificBackground}
          </p>
        </div>
      )}

      {researchData.researchObjectives && (
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ 
            marginBottom: '10px', 
            color: '#495057',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            מטרות מחקר ומטרות ספציפיות - Research objectives and specific aims
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            background: '#fff',
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            {researchData.researchObjectives}
          </p>
        </div>
      )}

      {researchData.detailedDescription && (
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ 
            marginBottom: '10px', 
            color: '#495057',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Detailed description of the proposed research - תיאור מפורט של המחקר המוצע
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            background: '#fff',
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            {researchData.detailedDescription}
          </p>
        </div>
      )}

      {researchData.significanceInnovation && (
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ 
            marginBottom: '10px', 
            color: '#495057',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Significance, innovation and potential benefits of the proposed research - משמעות, חדשנות ותועלת פוטנציאלית של המחקר המוצע
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            background: '#fff',
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            {researchData.significanceInnovation}
          </p>
        </div>
      )}

      {researchData.applicability && (
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ 
            marginBottom: '10px', 
            color: '#495057',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Applicability - ישימות
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            background: '#fff',
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            {researchData.applicability}
          </p>
        </div>
      )}
    </div>
  );
};

export default ResearchDescriptionSection;
