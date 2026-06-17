import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import ResearcherSelector from './ResearcherSelector';
import YearFilter from './YearFilter';
import AdminStatsBoxes from './AdminStatsBoxes';
import StatisticsTable from './StatisticsTable';
import { getYear, isIsraeliFund, isInternationalFund } from './utils';

const AdminStatistics = ({ 
  adminStats, 
  uniqueResearchers, 
  filteredResearch,
  // Controlled from parent so PDF export can reflect current selection
  selectedResearcherForStats,
  onResearcherChange,
  yearFilterType,
  onYearFilterTypeChange,
  researcherYearRange,
  onYearRangeChange,
}) => {
  const { t } = useLanguage();
  const [researcherStatsSearchTerm, setResearcherStatsSearchTerm] = useState('');

  const filteredResearchersForStats = useMemo(() => {
    return uniqueResearchers.filter(researcher =>
      researcher.toLowerCase().includes(researcherStatsSearchTerm.toLowerCase())
    );
  }, [uniqueResearchers, researcherStatsSearchTerm]);

  const baseResearcherStat = useMemo(() => {
    return selectedResearcherForStats !== 'all' 
      ? adminStats.byResearcher.find(r => r.researcherName === selectedResearcherForStats)
      : null;
  }, [selectedResearcherForStats, adminStats.byResearcher]);

  const selectedResearcherStat = useMemo(() => {
    if (!baseResearcherStat) return null;

    if (yearFilterType === 'all') {
      return baseResearcherStat;
    } else if (yearFilterType === 'range' && researcherYearRange.start && researcherYearRange.end) {
      const startYear = parseInt(researcherYearRange.start);
      const endYear = parseInt(researcherYearRange.end);
      
      const researcherResearch = filteredResearch.filter(r => 
        r.researcherName === selectedResearcherForStats &&
        getYear(r.submissionDate) >= startYear &&
        getYear(r.submissionDate) <= endYear
      );
      
      const filteredYears = [...new Set(researcherResearch.map(r => getYear(r.submissionDate)).filter(Boolean))].sort();
      const filteredAcademicYears = [...new Set(researcherResearch.map(r => r.academicYear).filter(Boolean))].sort();
      
      return {
        ...baseResearcherStat,
        totalSubmissions: researcherResearch.length,
        totalAwards: researcherResearch.filter(r => r.status === 'awarded').length,
        allYears: filteredYears,
        allAcademicYears: filteredAcademicYears,
        israeliFunds: researcherResearch.filter(r => isIsraeliFund(r.fundName)).length,
        internationalFunds: researcherResearch.filter(r => isInternationalFund(r.fundName)).length,
      };
    } else {
      return baseResearcherStat;
    }
  }, [baseResearcherStat, yearFilterType, researcherYearRange, filteredResearch, selectedResearcherForStats]);

  const filteredResearchData = useMemo(() => {
    let data = filteredResearch.filter(r => 
      r.researcherName === selectedResearcherForStats
    );
    
    if (yearFilterType === 'range' && researcherYearRange.start && researcherYearRange.end) {
      const startYear = parseInt(researcherYearRange.start);
      const endYear = parseInt(researcherYearRange.end);
      data = data.filter(r => {
        const year = getYear(r.submissionDate);
        return year >= startYear && year <= endYear;
      });
    }
    
    return data;
  }, [filteredResearch, selectedResearcherForStats, yearFilterType, researcherYearRange]);

  const tableColumns = {
    department: [
      { header: t('statsDepartment', 'מחלקה'), accessor: (row) => row.department },
      { header: t('statsTotalSubmissions', 'סה"כ הגשות'), accessor: (row) => row.totalSubmissions },
      { header: t('statsTotalAwards', 'סה"כ זכיות'), accessor: (row) => row.totalAwards },
      { header: t('statsTotalRejections', 'סה"כ דחיות'), accessor: (row) => row.totalRejections },
    ],
    fund: [
      { header: t('statsFund', 'קרן'), accessor: (row) => row.fundName },
      { header: t('statsTotalSubmissions', 'סה"כ הגשות'), accessor: (row) => row.totalSubmissions },
      { header: t('statsTotalAwards', 'סה"כ זכיות'), accessor: (row) => row.totalAwards },
      { header: t('statsTotalRejections', 'סה"כ דחיות'), accessor: (row) => row.totalRejections },
    ],
    year: [
      { header: t('statsYear', 'שנה'), accessor: (row) => row.year },
      { header: t('statsTotalSubmissions', 'סה"כ הגשות'), accessor: (row) => row.totalSubmissions },
      { header: t('statsTotalAwards', 'סה"כ זכיות'), accessor: (row) => row.totalAwards },
      { header: t('statsTotalRejections', 'סה"כ דחיות'), accessor: (row) => row.totalRejections },
    ],
  };

  return (
    <>
      <div className="statistics-section">
        <h2>{t('statsByResearcher', 'סטטיסטיקות לפי חוקר')}</h2>
        
        <ResearcherSelector
          uniqueResearchers={filteredResearchersForStats}
          searchTerm={researcherStatsSearchTerm}
          selectedResearcher={selectedResearcherForStats}
          onSearchChange={setResearcherStatsSearchTerm}
          onSelectChange={(value) => {
            onResearcherChange(value);
            if (value !== 'all') {
              setResearcherStatsSearchTerm(value);
            } else {
              setResearcherStatsSearchTerm('');
            }
          }}
        />
        
        {selectedResearcherForStats !== 'all' && baseResearcherStat && (
          <YearFilter
            yearFilterType={yearFilterType}
            yearRange={researcherYearRange}
            onFilterTypeChange={onYearFilterTypeChange}
            onYearRangeChange={onYearRangeChange}
          />
        )}
        
        {selectedResearcherStat ? (
          <AdminStatsBoxes
            selectedResearcherStat={selectedResearcherStat}
            filteredResearchData={filteredResearchData}
          />
        ) : (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#666',
            fontSize: '16px',
            background: '#f9f9f9',
            borderRadius: '8px'
          }}>
            {t('statsSelectResearcherPrompt', 'אנא בחר חוקר מהתפריט כדי לראות את הנתונים')}
          </div>
        )}
      </div>

      {adminStats.byDepartment.length > 0 && (
        <StatisticsTable
          title={t('statsByDepartment', 'סטטיסטיקות לפי מחלקה')}
          data={adminStats.byDepartment}
          columns={tableColumns.department}
        />
      )}

      <StatisticsTable
        title={t('statsByFund', 'סטטיסטיקות לפי קרן')}
        data={adminStats.byFund}
        columns={tableColumns.fund}
      />

      <div className="statistics-section">
        <h2>{t('statsByYear', 'סה"כ הגשות/זכיות/דחיות בשנה')}</h2>
        <StatisticsTable
          title=""
          data={adminStats.byYear}
          columns={tableColumns.year}
        />
        
        <div style={{ marginTop: '20px', padding: '15px', background: '#e8f4f8', borderRadius: '8px' }}>
          <h3>{t('statsAverages', 'ממוצעים')}:</h3>
          <p><strong>{t('statsNumberOfYears', 'מספר שנים')}:</strong> {adminStats.totalYears}</p>
          <p><strong>{t('statsAvgSubmissionsPerYear', 'ממוצע הגשות לשנה')}:</strong> {adminStats.avgSubmissionsPerYear}</p>
          <p><strong>{t('statsAvgAwardsPerYear', 'ממוצע זכיות לשנה')}:</strong> {adminStats.avgAwardsPerYear}</p>
          <p><strong>{t('statsAvgRejectionsPerYear', 'ממוצע דחיות לשנה')}:</strong> {adminStats.avgRejectionsPerYear}</p>
        </div>
      </div>
    </>
  );
};

export default AdminStatistics;
