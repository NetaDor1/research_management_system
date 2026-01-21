import React, { useState, useMemo } from 'react';
import ResearcherSelector from './ResearcherSelector';
import YearFilter from './YearFilter';
import AdminStatsBoxes from './AdminStatsBoxes';
import StatisticsTable from './StatisticsTable';
import { getYear, isIsraeliFund, isInternationalFund } from './utils';

const AdminStatistics = ({ 
  adminStats, 
  uniqueResearchers, 
  filteredResearch 
}) => {
  const [selectedResearcherForStats, setSelectedResearcherForStats] = useState('all');
  const [researcherStatsSearchTerm, setResearcherStatsSearchTerm] = useState('');
  const [yearFilterType, setYearFilterType] = useState('all');
  const [researcherYearRange, setResearcherYearRange] = useState({ start: '', end: '' });

  // Filter researchers based on search term
  const filteredResearchersForStats = useMemo(() => {
    return uniqueResearchers.filter(researcher =>
      researcher.toLowerCase().includes(researcherStatsSearchTerm.toLowerCase())
    );
  }, [uniqueResearchers, researcherStatsSearchTerm]);

  // Get base researcher data
  const baseResearcherStat = useMemo(() => {
    return selectedResearcherForStats !== 'all' 
      ? adminStats.byResearcher.find(r => r.researcherName === selectedResearcherForStats)
      : null;
  }, [selectedResearcherForStats, adminStats.byResearcher]);

  // Filter by year range if selected
  const selectedResearcherStat = useMemo(() => {
    if (!baseResearcherStat) return null;

    if (yearFilterType === 'all') {
      return baseResearcherStat;
    } else if (yearFilterType === 'range' && researcherYearRange.start && researcherYearRange.end) {
      const startYear = parseInt(researcherYearRange.start);
      const endYear = parseInt(researcherYearRange.end);
      
      // Filter research data for this researcher by year range
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

  // Get filtered research data for details
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

  return (
    <>
      {/* Statistics by Researcher */}
      <div className="statistics-section">
        <h2>סטטיסטיקות לפי חוקר</h2>
        
        <ResearcherSelector
          uniqueResearchers={filteredResearchersForStats}
          searchTerm={researcherStatsSearchTerm}
          selectedResearcher={selectedResearcherForStats}
          onSearchChange={setResearcherStatsSearchTerm}
          onSelectChange={(value) => {
            setSelectedResearcherForStats(value);
            if (value !== 'all') {
              setResearcherStatsSearchTerm(value);
            } else {
              setResearcherStatsSearchTerm('');
            }
          }}
        />
        
        {/* Year Filter */}
        {selectedResearcherForStats !== 'all' && baseResearcherStat && (
          <YearFilter
            yearFilterType={yearFilterType}
            yearRange={researcherYearRange}
            onFilterTypeChange={setYearFilterType}
            onYearRangeChange={setResearcherYearRange}
          />
        )}
        
        {/* Display selected researcher statistics */}
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
            אנא בחר חוקר מהתפריט כדי לראות את הנתונים
          </div>
        )}
      </div>

      {/* Statistics by Department */}
      {adminStats.byDepartment.length > 0 && (
        <StatisticsTable
          title="סטטיסטיקות לפי מחלקה"
          data={adminStats.byDepartment}
          columns={[
            { header: 'מחלקה', accessor: (row) => row.department },
            { header: 'סה"כ הגשות', accessor: (row) => row.totalSubmissions },
            { header: 'סה"כ זכיות', accessor: (row) => row.totalAwards },
            { header: 'סה"כ דחיות', accessor: (row) => row.totalRejections }
          ]}
        />
      )}

      {/* Statistics by Fund */}
      <StatisticsTable
        title="סטטיסטיקות לפי קרן"
        data={adminStats.byFund}
        columns={[
          { header: 'קרן', accessor: (row) => row.fundName },
          { header: 'סה"כ הגשות', accessor: (row) => row.totalSubmissions },
          { header: 'סה"כ זכיות', accessor: (row) => row.totalAwards },
          { header: 'סה"כ דחיות', accessor: (row) => row.totalRejections }
        ]}
      />

      {/* Total Statistics per Year */}
      <div className="statistics-section">
        <h2>סה"כ הגשות/זכיות/דחיות בשנה</h2>
        <StatisticsTable
          title=""
          data={adminStats.byYear}
          columns={[
            { header: 'שנה', accessor: (row) => row.year },
            { header: 'סה"כ הגשות', accessor: (row) => row.totalSubmissions },
            { header: 'סה"כ זכיות', accessor: (row) => row.totalAwards },
            { header: 'סה"כ דחיות', accessor: (row) => row.totalRejections }
          ]}
        />
        
        <div style={{ marginTop: '20px', padding: '15px', background: '#e8f4f8', borderRadius: '8px' }}>
          <h3>ממוצעים:</h3>
          <p><strong>מספר שנים:</strong> {adminStats.totalYears}</p>
          <p><strong>ממוצע הגשות לשנה:</strong> {adminStats.avgSubmissionsPerYear}</p>
          <p><strong>ממוצע זכיות לשנה:</strong> {adminStats.avgAwardsPerYear}</p>
          <p><strong>ממוצע דחיות לשנה:</strong> {adminStats.avgRejectionsPerYear}</p>
        </div>
      </div>
    </>
  );
};

export default AdminStatistics;
