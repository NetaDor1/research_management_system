import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import StatBox, { renderSubmissionsList, renderAwardsList, renderFundsList } from './StatBox';
import { getYear } from './utils';

const ResearcherStatsBoxes = ({ researcherStats, filteredResearch }) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const i18n = { t, isRTL };
  const [expandedStatBox, setExpandedStatBox] = useState(null);
  
  const submissions = filteredResearch;
  const awards = filteredResearch.filter(r => r.status === 'awarded');
  const researcherResearch = filteredResearch;

  return (
    <div className="statistics-section">
      <h2>{t('statsResearcherSection', 'סטטיסטיקות חוקר')}</h2>
      <div className="stats-grid">
        <StatBox
          value={researcherStats.totalSubmissions}
          label={t('statsTotalSubmissions', 'סה"כ הגשות')}
          expanded={expandedStatBox === 'submissions'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'submissions' ? null : 'submissions')}
          expandedContent={renderSubmissionsList(submissions, getYear, i18n)}
        />
        
        <StatBox
          value={researcherStats.totalAwards}
          label={t('statsTotalAwards', 'סה"כ זכיות')}
          expanded={expandedStatBox === 'awards'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'awards' ? null : 'awards')}
          expandedContent={renderAwardsList(awards, getYear, i18n)}
        />
        
        <StatBox
          value={researcherStats.allYears.length}
          label={t('statsYearsCount', 'מספר שנים')}
          expanded={expandedStatBox === 'years'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'years' ? null : 'years')}
          expandedContent={
            <>
              <h4 style={{ marginBottom: '10px', textAlign, fontSize: '14px', fontWeight: 'bold' }}>
                {t('statsAllYears', 'כל השנים')}:
              </h4>
              <p style={{ textAlign }}>{researcherStats.allYears.join(', ')}</p>
            </>
          }
        />
        
        <StatBox
          value={researcherStats.israeliFunds}
          label={t('statsIsraeliFunds', 'קרנות בארץ')}
          expanded={expandedStatBox === 'israeliFunds'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'israeliFunds' ? null : 'israeliFunds')}
          expandedContent={renderFundsList(researcherResearch, true, i18n)}
        />
        
        <StatBox
          value={researcherStats.internationalFunds}
          label={t('statsInternationalFunds', 'קרנות בחו"ל')}
          expanded={expandedStatBox === 'internationalFunds'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'internationalFunds' ? null : 'internationalFunds')}
          expandedContent={renderFundsList(researcherResearch, false, i18n)}
        />
      </div>
    </div>
  );
};

export default ResearcherStatsBoxes;
