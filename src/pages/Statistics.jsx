import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStatisticsData } from '../components/statistics/useStatisticsData';
import {
  isIsraeliFund, 
  isInternationalFund, 
  getYear 
} from '../components/statistics/utils';
import ResearcherStatistics from '../components/statistics/ResearcherStatistics';
import AdminStatistics from '../components/statistics/AdminStatistics';
import AdminCharts from '../components/statistics/AdminCharts';
import './Page.css';
import './Research.css';

const Statistics = () => {
  const { isAdmin, user, userRole } = useAuth();
  const { t } = useLanguage();
  const { researchData, loading, error } = useStatisticsData(userRole, user?.id);
  
  // Filters for admin view
  const [selectedResearcher, setSelectedResearcher] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedFund, setSelectedFund] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [yearRange, setYearRange] = useState({ start: '', end: '' });
  
  // Filter for researcher chart (separate from main filters)
  const [selectedResearcherForChart, setSelectedResearcherForChart] = useState('all');
  const [researcherSearchTerm, setResearcherSearchTerm] = useState('');

  // Filter data based on admin filters
  const filteredResearch = useMemo(() => {
    let filtered = [...researchData];

    if (isAdmin()) {
      if (selectedResearcher !== 'all') {
        filtered = filtered.filter(r => r.researcherName === selectedResearcher);
      }
      if (selectedDepartment !== 'all' && selectedDepartment) {
        filtered = filtered.filter(r => r.department === selectedDepartment);
      }
      if (selectedFund !== 'all') {
        filtered = filtered.filter(r => r.fundName === selectedFund);
      }
      if (selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        filtered = filtered.filter(r => {
          const submissionYear = getYear(r.submissionDate);
          return submissionYear === year;
        });
      }
      if (yearRange.start && yearRange.end) {
        const startYear = parseInt(yearRange.start);
        const endYear = parseInt(yearRange.end);
        filtered = filtered.filter(r => {
          const submissionYear = getYear(r.submissionDate);
          return submissionYear >= startYear && submissionYear <= endYear;
        });
      }
    }

    return filtered;
  }, [researchData, isAdmin, selectedResearcher, selectedDepartment, selectedFund, selectedYear, yearRange]);

  // Get unique values for filters
  const uniqueResearchers = useMemo(() => {
    const researchers = [...new Set(researchData.map(r => r.researcherName))].filter(Boolean);
    return researchers.sort();
  }, [researchData]);

  const uniqueDepartments = useMemo(() => {
    const departments = [...new Set(researchData.map(r => r.department))].filter(Boolean);
    return departments.sort();
  }, [researchData]);

  const uniqueFunds = useMemo(() => {
    const funds = [...new Set(researchData.map(r => r.fundName))].filter(Boolean);
    return funds.sort();
  }, [researchData]);

  const uniqueYears = useMemo(() => {
    const years = researchData
      .map(r => getYear(r.submissionDate))
      .filter(y => y !== null);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [researchData]);

  // Calculate statistics for researcher
  const researcherStats = useMemo(() => {
    if (isAdmin()) return null;

    const research = filteredResearch;
    
    // Get all years
    const allYears = [...new Set(research.map(r => getYear(r.submissionDate)).filter(Boolean))].sort();
    const allAcademicYears = [...new Set(research.map(r => r.academicYear).filter(Boolean))].sort();

    // Count by fund type
    const israeliFundsCount = research.filter(r => isIsraeliFund(r.fundName)).length;
    const internationalFundsCount = research.filter(r => isInternationalFund(r.fundName)).length;

    // Statistics by year
    const byYear = allYears.map(year => {
      const yearResearch = research.filter(r => getYear(r.submissionDate) === year);
      return {
        year,
        totalSubmissions: yearResearch.length,
        totalAwards: yearResearch.filter(r => r.status === 'awarded').length,
        totalRejections: yearResearch.filter(r => r.status === 'rejected').length,
      };
    });

    return {
      totalSubmissions: research.length,
      totalAwards: research.filter(r => r.status === 'awarded').length,
      totalRejections: research.filter(r => r.status === 'rejected').length,
      allYears: allYears,
      allAcademicYears: allAcademicYears,
      israeliFunds: israeliFundsCount,
      internationalFunds: internationalFundsCount,
      byYear: byYear,
    };
  }, [isAdmin, filteredResearch]);

  // Calculate statistics for admin
  const adminStats = useMemo(() => {
    if (!isAdmin()) return null;

    const research = filteredResearch;
    
    // Statistics by researcher
    const byResearcher = uniqueResearchers.map(researcherName => {
      const researcherResearch = research.filter(r => r.researcherName === researcherName);
      const allYears = [...new Set(researcherResearch.map(r => getYear(r.submissionDate)).filter(Boolean))].sort();
      const allAcademicYears = [...new Set(researcherResearch.map(r => r.academicYear).filter(Boolean))].sort();
      
      return {
        researcherName,
        totalSubmissions: researcherResearch.length,
        totalAwards: researcherResearch.filter(r => r.status === 'awarded').length,
        allYears,
        allAcademicYears,
        israeliFunds: researcherResearch.filter(r => isIsraeliFund(r.fundName)).length,
        internationalFunds: researcherResearch.filter(r => isInternationalFund(r.fundName)).length,
      };
    });

    // Statistics by department
    const byDepartment = uniqueDepartments.map(department => {
      const deptResearch = research.filter(r => r.department === department);
      return {
        department,
        totalSubmissions: deptResearch.length,
        totalAwards: deptResearch.filter(r => r.status === 'awarded').length,
        totalRejections: deptResearch.filter(r => r.status === 'rejected').length,
      };
    });

    // Statistics by fund
    const byFund = uniqueFunds.map(fundName => {
      const fundResearch = research.filter(r => r.fundName === fundName);
      return {
        fundName,
        totalSubmissions: fundResearch.length,
        totalAwards: fundResearch.filter(r => r.status === 'awarded').length,
        totalRejections: fundResearch.filter(r => r.status === 'rejected').length,
      };
    });

    // Total statistics per year
    const byYear = uniqueYears.map(year => {
      const yearResearch = research.filter(r => getYear(r.submissionDate) === year);
      return {
        year,
        totalSubmissions: yearResearch.length,
        totalAwards: yearResearch.filter(r => r.status === 'awarded').length,
        totalRejections: yearResearch.filter(r => r.status === 'rejected').length,
      };
    });

    // Calculate averages
    const totalYears = uniqueYears.length || 1;
    const avgSubmissionsPerYear = research.length / totalYears;
    const avgAwardsPerYear = research.filter(r => r.status === 'awarded').length / totalYears;
    const avgRejectionsPerYear = research.filter(r => r.status === 'rejected').length / totalYears;

    return {
      byResearcher,
      byDepartment,
      byFund,
      byYear,
      totalYears,
      avgSubmissionsPerYear: avgSubmissionsPerYear.toFixed(2),
      avgAwardsPerYear: avgAwardsPerYear.toFixed(2),
      avgRejectionsPerYear: avgRejectionsPerYear.toFixed(2),
    };
  }, [isAdmin, filteredResearch, uniqueResearchers, uniqueDepartments, uniqueFunds, uniqueYears]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <p>{t('loadingData', 'טוען נתונים...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-content">
          <p style={{ color: 'red' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>
          {isAdmin() ? t('adminStatistics', 'סטטיסטיקות רשות המחקר') : t('myStatistics', 'הסטטיסטיקות שלי')}
        </h1>
        <p className="welcome-text">
          {isAdmin()
            ? t('statsAdminSubtitle', 'סקירה מפורטת של כל המחקרים במכללה עם חיתוכים שונים')
            : t('statsResearcherSubtitle', 'סקירה של המחקרים שלך עם חיתוכים שונים')}
        </p>

        {/* Researcher Statistics */}
        {!isAdmin() && researcherStats && (
          <ResearcherStatistics 
            researcherStats={researcherStats} 
            filteredResearch={filteredResearch} 
          />
        )}

        {/* Admin Statistics */}
        {isAdmin() && adminStats && (
          <>
            <AdminStatistics 
              adminStats={adminStats}
              uniqueResearchers={uniqueResearchers}
              filteredResearch={filteredResearch}
            />
            <AdminCharts
              adminStats={adminStats}
              uniqueResearchers={uniqueResearchers}
              selectedResearcherForChart={selectedResearcherForChart}
              researcherSearchTerm={researcherSearchTerm}
              onResearcherSearchChange={(value) => {
                setResearcherSearchTerm(value);
                // Auto-select if only one result
                const filtered = uniqueResearchers.filter(r =>
                  r.toLowerCase().includes(value.toLowerCase())
                );
                if (value && filtered.length === 1) {
                  setSelectedResearcherForChart(filtered[0]);
                }
              }}
              onResearcherSelectChange={(value) => {
                setSelectedResearcherForChart(value);
                if (value !== 'all') {
                  setResearcherSearchTerm(value);
                }
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Statistics;
