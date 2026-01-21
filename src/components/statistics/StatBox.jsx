import React from 'react';
import { getYear, isIsraeliFund, isInternationalFund } from './utils';

const StatBox = ({ 
  value, 
  label, 
  expanded, 
  onToggle, 
  expandedContent 
}) => {
  return (
    <div 
      className="stat-box"
      onClick={onToggle}
      style={{ 
        cursor: 'pointer', 
        transition: 'transform 0.2s', 
        transform: expanded ? 'scale(1.05)' : 'scale(1)' 
      }}
    >
      <div className="stat-box-value">{value}</div>
      <div className="stat-box-label">{label}</div>
      {expanded && expandedContent && (
        <div style={{ 
          marginTop: '15px', 
          padding: '15px', 
          background: '#fff', 
          borderRadius: '8px', 
          maxHeight: '300px', 
          overflowY: 'auto' 
        }}>
          {expandedContent}
        </div>
      )}
    </div>
  );
};

export const renderSubmissionsList = (submissions, getYear) => {
  if (submissions.length === 0) {
    return (
      <>
        <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
          רשימת הגשות:
        </h4>
        <p style={{ textAlign: 'right', color: '#666' }}>אין הגשות</p>
      </>
    );
  }

  return (
    <>
      <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
        רשימת הגשות:
      </h4>
      <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
        {submissions.map((r, idx) => (
          <li key={idx} style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
            <strong>{r.title || r.projectTitle || 'ללא כותרת'}</strong> - {r.fundName || 'ללא קרן'} ({getYear(r.submissionDate) || 'ללא תאריך'})
            <br />
            <small style={{ color: '#666' }}>
              סטטוס: {r.status === 'awarded' ? 'זכייה' : r.status === 'rejected' ? 'דחייה' : 'בהמתנה'}
            </small>
          </li>
        ))}
      </ul>
    </>
  );
};

export const renderAwardsList = (awards, getYear) => {
  if (awards.length === 0) {
    return (
      <>
        <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
          רשימת זכיות:
        </h4>
        <p style={{ textAlign: 'right', color: '#666' }}>אין זכיות</p>
      </>
    );
  }

  return (
    <>
      <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
        רשימת זכיות:
      </h4>
      <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
        {awards.map((r, idx) => (
          <li key={idx} style={{ marginBottom: '8px', padding: '8px', background: '#d4edda', borderRadius: '4px' }}>
            <strong>{r.title || r.projectTitle || 'ללא כותרת'}</strong> - {r.fundName || 'ללא קרן'} ({getYear(r.submissionDate) || 'ללא תאריך'})
          </li>
        ))}
      </ul>
    </>
  );
};

export const renderFundsList = (researchData, isIsraeli) => {
  const filtered = researchData.filter(r => 
    isIsraeli ? isIsraeliFund(r.fundName) : isInternationalFund(r.fundName)
  );
  
  if (filtered.length === 0) {
    return (
      <>
        <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
          {isIsraeli ? 'קרנות בארץ:' : 'קרנות בחו"ל:'}
        </h4>
        <p style={{ textAlign: 'right', color: '#666' }}>
          {isIsraeli ? 'אין קרנות בארץ' : 'אין קרנות בחו"ל'}
        </p>
      </>
    );
  }

  const fundGroups = {};
  filtered.forEach(r => {
    if (!fundGroups[r.fundName]) fundGroups[r.fundName] = [];
    fundGroups[r.fundName].push(r);
  });

  return (
    <>
      <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
        {isIsraeli ? 'קרנות בארץ:' : 'קרנות בחו"ל:'}
      </h4>
      <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
        {Object.entries(fundGroups).map(([fundName, researchList]) => (
          <li key={fundName} style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
            <strong>{fundName}</strong> ({researchList.length} מחקרים)
          </li>
        ))}
      </ul>
    </>
  );
};

export default StatBox;
