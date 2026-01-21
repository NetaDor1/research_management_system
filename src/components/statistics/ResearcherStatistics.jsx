import React from 'react';
import ResearcherStatsBoxes from './ResearcherStatsBoxes';
import ResearcherCharts from './ResearcherCharts';

const ResearcherStatistics = ({ researcherStats, filteredResearch }) => {
  if (!researcherStats) return null;

  return (
    <>
      <ResearcherStatsBoxes 
        researcherStats={researcherStats} 
        filteredResearch={filteredResearch} 
      />
      <ResearcherCharts researcherStats={researcherStats} />
    </>
  );
};

export default ResearcherStatistics;
