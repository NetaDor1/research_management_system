import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import StatBox, { renderSubmissionsList, renderAwardsList, renderFundsList } from './StatBox';
import { getYear } from './utils';

const AdminStatsBoxes = ({ 
  selectedResearcherStat, 
  filteredResearchData 
}) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const i18n = { t, isRTL };
  const [expandedStatBox, setExpandedStatBox] = useState(null);
  
  if (!selectedResearcherStat) return null;

  const submissions = filteredResearchData;
  const awards = filteredResearchData.filter(r => r.status === 'awarded');

  return (
    <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: '20px', textAlign, color: '#333' }}>
        {t('statsDataFor', 'נתונים עבור')}: {selectedResearcherStat.researcherName}
      </h3>
      <div className="stats-grid">
        <StatBox
          value={selectedResearcherStat.totalSubmissions}
          label={t('statsTotalSubmissions', 'סה"כ הגשות')}
          expanded={expandedStatBox === 'submissions'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'submissions' ? null : 'submissions')}
          expandedContent={renderSubmissionsList(submissions, getYear, i18n)}
        />
        
        <StatBox
          value={selectedResearcherStat.totalAwards}
          label={t('statsTotalAwards', 'סה"כ זכיות')}
          expanded={expandedStatBox === 'awards'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'awards' ? null : 'awards')}
          expandedContent={renderAwardsList(awards, getYear, i18n)}
        />
        
        <StatBox
          value={selectedResearcherStat.allYears.length}
          label={t('statsYearsCount', 'מספר שנים')}
          expanded={expandedStatBox === 'years'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'years' ? null : 'years')}
          expandedContent={
            <>
              <h4 style={{ marginBottom: '10px', textAlign, fontSize: '14px', fontWeight: 'bold' }}>
                {t('statsAllYears', 'כל השנים')}:
              </h4>
              <p style={{ textAlign }}>{selectedResearcherStat.allYears.join(', ')}</p>
            </>
          }
        />
        
        <StatBox
          value={selectedResearcherStat.israeliFunds}
          label={t('statsIsraeliFunds', 'קרנות בארץ')}
          expanded={expandedStatBox === 'israeliFunds'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'israeliFunds' ? null : 'israeliFunds')}
          expandedContent={renderFundsList(filteredResearchData, true, i18n)}
        />
        
        <StatBox
          value={selectedResearcherStat.internationalFunds}
          label={t('statsInternationalFunds', 'קרנות בחו"ל')}
          expanded={expandedStatBox === 'internationalFunds'}
          onToggle={() => setExpandedStatBox(expandedStatBox === 'internationalFunds' ? null : 'internationalFunds')}
          expandedContent={renderFundsList(filteredResearchData, false, i18n)}
        />
      </div>
    </div>
  );
};

export default AdminStatsBoxes;
