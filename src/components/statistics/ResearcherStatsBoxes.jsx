import React, { useState } from 'react';
import StatBox, { renderSubmissionsList, renderAwardsList, renderFundsList } from './StatBox';
import { getYear } from './utils';

const ResearcherStatsBoxes = ({ researcherStats, filteredResearch }) => {
  const [expandedStatBox, setExpandedStatBox] = useState(null);
  
  const submissions = filteredResearch;
  const awards = filteredResearch.filter(r => r.status === 'awarded');
  const rejections = filteredResearch.filter(r => r.status === 'rejected');
  const researcherResearch = filteredResearch;

  return (
    <div className="statistics-section">
      <h2>סטטיסטיקות חוקר</h2>
      <div className="stats-grid">
        <StatBox
          value={researcherStats.totalSubmissions}
          label="סה&quot;כ הגשות"
          expanded={expandedStatBox === 'submissions'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'submissions' ? null : 'submissions')}
          expandedContent={renderSubmissionsList(submissions, getYear)}
        />
        
        <StatBox
          value={researcherStats.totalAwards}
          label="סה&quot;כ זכיות"
          expanded={expandedStatBox === 'awards'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'awards' ? null : 'awards')}
          expandedContent={renderAwardsList(awards, getYear)}
        />
        
        <StatBox
          value={researcherStats.allYears.length}
          label="מספר שנים"
          expanded={expandedStatBox === 'years'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'years' ? null : 'years')}
          expandedContent={
            <>
              <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
                כל השנים:
              </h4>
              <p style={{ textAlign: 'right' }}>{researcherStats.allYears.join(', ')}</p>
            </>
          }
        />
        
        <StatBox
          value={researcherStats.israeliFunds}
          label="קרנות בארץ"
          expanded={expandedStatBox === 'israeliFunds'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'israeliFunds' ? null : 'israeliFunds')}
          expandedContent={renderFundsList(researcherResearch, true)}
        />
        
        <StatBox
          value={researcherStats.internationalFunds}
          label="קרנות בחו&quot;ל"
          expanded={expandedStatBox === 'internationalFunds'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'internationalFunds' ? null : 'internationalFunds')}
          expandedContent={renderFundsList(researcherResearch, false)}
        />
      </div>
    </div>
  );
};

export default ResearcherStatsBoxes;
