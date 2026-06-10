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

const getStatusLabel = (status, t) => {
  if (status === 'awarded') return t('awarded', 'זכייה');
  if (status === 'rejected') return t('statsRejection', 'דחייה');
  return t('statsPending', 'בהמתנה');
};

export const renderSubmissionsList = (submissions, getYearFn, { t, isRTL }) => {
  const textAlign = isRTL ? 'right' : 'left';
  const direction = isRTL ? 'rtl' : 'ltr';

  if (submissions.length === 0) {
    return (
      <>
        <h4 style={{ marginBottom: '10px', textAlign, fontSize: '14px', fontWeight: 'bold' }}>
          {t('statsSubmissionsList', 'רשימת הגשות')}:
        </h4>
        <p style={{ textAlign, color: '#666' }}>{t('statsNoSubmissions', 'אין הגשות')}</p>
      </>
    );
  }

  return (
    <>
      <h4 style={{ marginBottom: '10px', textAlign, fontSize: '14px', fontWeight: 'bold' }}>
        {t('statsSubmissionsList', 'רשימת הגשות')}:
      </h4>
      <ul style={{ listStyle: 'none', padding: 0, direction, textAlign }}>
        {submissions.map((r, idx) => (
          <li key={idx} style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
            <strong>{r.title || r.projectTitle || t('noTitle', 'ללא כותרת')}</strong> - {r.fundName || t('statsNoFund', 'ללא קרן')} ({getYearFn(r.submissionDate) || t('statsNoDate', 'ללא תאריך')})
            <br />
            <small style={{ color: '#666' }}>
              {t('statsStatusLabel', 'סטטוס')}: {getStatusLabel(r.status, t)}
            </small>
          </li>
        ))}
      </ul>
    </>
  );
};

export const renderAwardsList = (awards, getYearFn, { t, isRTL }) => {
  const textAlign = isRTL ? 'right' : 'left';
  const direction = isRTL ? 'rtl' : 'ltr';

  if (awards.length === 0) {
    return (
      <>
        <h4 style={{ marginBottom: '10px', textAlign, fontSize: '14px', fontWeight: 'bold' }}>
          {t('statsAwardsList', 'רשימת זכיות')}:
        </h4>
        <p style={{ textAlign, color: '#666' }}>{t('statsNoAwards', 'אין זכיות')}</p>
      </>
    );
  }

  return (
    <>
      <h4 style={{ marginBottom: '10px', textAlign, fontSize: '14px', fontWeight: 'bold' }}>
        {t('statsAwardsList', 'רשימת זכיות')}:
      </h4>
      <ul style={{ listStyle: 'none', padding: 0, direction, textAlign }}>
        {awards.map((r, idx) => (
          <li key={idx} style={{ marginBottom: '8px', padding: '8px', background: '#d4edda', borderRadius: '4px' }}>
            <strong>{r.title || r.projectTitle || t('noTitle', 'ללא כותרת')}</strong> - {r.fundName || t('statsNoFund', 'ללא קרן')} ({getYearFn(r.submissionDate) || t('statsNoDate', 'ללא תאריך')})
          </li>
        ))}
      </ul>
    </>
  );
};

export const renderFundsList = (researchData, isIsraeli, { t, isRTL }) => {
  const textAlign = isRTL ? 'right' : 'left';
  const direction = isRTL ? 'rtl' : 'ltr';
  const filtered = researchData.filter(r => 
    isIsraeli ? isIsraeliFund(r.fundName) : isInternationalFund(r.fundName)
  );
  const fundsTitle = isIsraeli
    ? t('statsIsraeliFunds', 'קרנות בארץ')
    : t('statsInternationalFunds', 'קרנות בחו"ל');
  const noFundsMessage = isIsraeli
    ? t('statsNoIsraeliFunds', 'אין קרנות בארץ')
    : t('statsNoInternationalFunds', 'אין קרנות בחו"ל');
  
  if (filtered.length === 0) {
    return (
      <>
        <h4 style={{ marginBottom: '10px', textAlign, fontSize: '14px', fontWeight: 'bold' }}>
          {fundsTitle}:
        </h4>
        <p style={{ textAlign, color: '#666' }}>{noFundsMessage}</p>
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
      <h4 style={{ marginBottom: '10px', textAlign, fontSize: '14px', fontWeight: 'bold' }}>
        {fundsTitle}:
      </h4>
      <ul style={{ listStyle: 'none', padding: 0, direction, textAlign }}>
        {Object.entries(fundGroups).map(([fundName, researchList]) => (
          <li key={fundName} style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
            <strong>{fundName}</strong> ({researchList.length} {t('statsResearchCount', 'מחקרים')})
          </li>
        ))}
      </ul>
    </>
  );
};

export default StatBox;
