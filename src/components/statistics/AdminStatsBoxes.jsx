import React, { useState } from 'react';
import StatBox, { renderSubmissionsList, renderAwardsList, renderFundsList } from './StatBox';
import { getYear } from './utils';

const AdminStatsBoxes = ({ 
  selectedResearcherStat, 
  filteredResearchData 
}) => {
  const [expandedStatBox, setExpandedStatBox] = useState(null);
  
  if (!selectedResearcherStat) return null;

  const submissions = filteredResearchData;
  const awards = filteredResearchData.filter(r => r.status === 'awarded');

  return (
    <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: '20px', textAlign: 'right', color: '#333' }}>
        נתונים עבור: {selectedResearcherStat.researcherName}
      </h3>
      <div className="stats-grid">
        <StatBox
          value={selectedResearcherStat.totalSubmissions}
          label="סה&quot;כ הגשות"
          expanded={expandedStatBox === 'submissions'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'submissions' ? null : 'submissions')}
          expandedContent={renderSubmissionsList(submissions, getYear)}
        />
        
        <StatBox
          value={selectedResearcherStat.totalAwards}
          label="סה&quot;כ זכיות"
          expanded={expandedStatBox === 'awards'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'awards' ? null : 'awards')}
          expandedContent={renderAwardsList(awards, getYear)}
        />
        
        <StatBox
          value={selectedResearcherStat.allYears.length}
          label="מספר שנים"
          expanded={expandedStatBox === 'years'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'years' ? null : 'years')}
          expandedContent={
            <>
              <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                כל השנים:
              </h4>
              <p style={{ textAlign: 'right' }}>{selectedResearcherStat.allYears.join(', ')}</p>
            </>
          }
        />
        
        <StatBox
          value={selectedResearcherStat.israeliFunds}
          label="קרנות בארץ"
          expanded={expandedStatBox === 'israeliFunds'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'israeliFunds' ? null : 'israeliFunds')}
          expandedContent={renderFundsList(filteredResearchData, true)}
        />
        
        <StatBox
          value={selectedResearcherStat.internationalFunds}
          label="קרנות בחו&quot;ל"
          expanded={expandedStatBox === 'internationalFunds'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'internationalFunds' ? null : 'internationalFunds')}
          expandedContent={renderFundsList(filteredResearchData, false)}
        />
      </div>
    </div>
  );
};

export default AdminStatsBoxes;
