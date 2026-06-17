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
import { exportPrintableHtmlToPdf, escapeHtml } from '../utils/exportPdf';
import './Page.css';
import './Research.css';

const Statistics = () => {
  const { isAdmin, user, userRole } = useAuth();
  const { t, language } = useLanguage();
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

  // Admin statistics detail filters — lifted so PDF can reflect current selection
  const [statsResearcher, setStatsResearcher] = useState('all');
  const [statsYearFilterType, setStatsYearFilterType] = useState('all');
  const [statsYearRange, setStatsYearRange] = useState({ start: '', end: '' });

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

  const buildTableHtml = (headers, rows) => `
    <table>
      <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(cells =>
        `<tr>${cells.map(c => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`
      ).join('')}</tbody>
    </table>`;

  const handleExportPDF = () => {
    const dir = language === 'en' ? 'ltr' : 'rtl';
    const lang = language === 'en' ? 'en' : 'he';
    const generatedAt = language === 'en'
      ? `Generated on ${new Date().toLocaleString('en-US')}`
      : `נוצר ב-${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL')}`;

    let title, htmlBody;

    if (isAdmin() && adminStats) {
      title = t('adminStatistics', 'סטטיסטיקות רשות המחקר');

      const hasResearcherFilter = statsResearcher !== 'all';
      const hasYearFilter = statsYearFilterType === 'range' && statsYearRange.start && statsYearRange.end;

      // ── Researcher-specific section (shown only when a researcher is selected) ──
      // Mirrors the AdminStatsBoxes that appears in the UI for a selected researcher.
      let researcherSection = '';
      if (hasResearcherFilter) {
        let rResearch = filteredResearch.filter(r => r.researcherName === statsResearcher);
        if (hasYearFilter) {
          const startY = parseInt(statsYearRange.start);
          const endY = parseInt(statsYearRange.end);
          rResearch = rResearch.filter(r => {
            const y = getYear(r.submissionDate);
            return y !== null && y >= startY && y <= endY;
          });
        }

        const rTotal = rResearch.length;
        const rAwards = rResearch.filter(r => r.status === 'awarded').length;
        const rRej = rResearch.filter(r => r.status === 'rejected').length;

        // Year breakdown for this researcher.
        // When a year-range filter is active, seed only the years in that range.
        // Otherwise seed all globally-known years so context is preserved.
        const rYearMap = {};
        if (hasYearFilter) {
          const startY = parseInt(statsYearRange.start);
          const endY = parseInt(statsYearRange.end);
          for (let y = startY; y <= endY; y++) rYearMap[y] = [0, 0, 0];
        } else {
          adminStats.byYear.forEach(row => { rYearMap[row.year] = [0, 0, 0]; });
        }
        rResearch.forEach(r => {
          const y = getYear(r.submissionDate);
          if (y === null) return;
          if (!rYearMap[y]) rYearMap[y] = [0, 0, 0];
          rYearMap[y][0] += 1;
          if (r.status === 'awarded') rYearMap[y][1] += 1;
          if (r.status === 'rejected') rYearMap[y][2] += 1;
        });
        const rYearRows = Object.entries(rYearMap)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([y, [s, a, rej]]) => [y, s, a, rej]);

        // Fund breakdown for this researcher
        const rFundMap = {};
        rResearch.forEach(r => {
          const k = r.fundName || t('notSpecified', 'לא צוין');
          if (!rFundMap[k]) rFundMap[k] = [0, 0, 0];
          rFundMap[k][0] += 1;
          if (r.status === 'awarded') rFundMap[k][1] += 1;
          if (r.status === 'rejected') rFundMap[k][2] += 1;
        });
        const rFundRows = Object.entries(rFundMap)
          .sort((a, b) => b[1][0] - a[1][0])
          .map(([f, [s, a, rej]]) => [f, s, a, rej]);

        const yearLabel = hasYearFilter ? ` (${statsYearRange.start}–${statsYearRange.end})` : '';
        researcherSection = `
          <div class="section">
            <h2>${escapeHtml(t('statsDataFor', 'נתונים עבור'))}: ${escapeHtml(statsResearcher)}${escapeHtml(yearLabel)}</h2>
            <div style="padding:8pt;background:#f0f0f0;border:1pt solid #ccc;margin-bottom:8pt;">
              <p><strong>${escapeHtml(t('statsTotalSubmissions', 'סה"כ הגשות'))}:</strong> ${rTotal} &nbsp;&nbsp;
                 <strong>${escapeHtml(t('statsTotalAwards', 'זכיות'))}:</strong> ${rAwards} &nbsp;&nbsp;
                 <strong>${escapeHtml(t('statsTotalRejections', 'דחיות'))}:</strong> ${rRej}</p>
            </div>
            ${rYearRows.length > 0 ? buildTableHtml(
              [t('statsYear','שנה'), t('statsTotalSubmissions','הגשות'), t('statsTotalAwards','זכיות'), t('statsTotalRejections','דחיות')],
              rYearRows
            ) : ''}
            ${rFundRows.length > 0 ? `<div style="margin-top:8pt;">${buildTableHtml(
              [t('statsFund','קרן'), t('statsTotalSubmissions','הגשות'), t('statsTotalAwards','זכיות'), t('statsTotalRejections','דחיות')],
              rFundRows
            )}</div>` : ''}
          </div>`;
      }

      // ── Global tables — always taken directly from adminStats, identical to UI ──
      const globalResearcherTable = adminStats.byResearcher.length > 0 ? buildTableHtml(
        [t('researcher','חוקר'), t('statsTotalSubmissions','הגשות'), t('statsTotalAwards','זכיות'), t('statsIsraeliFunds','קרנות בארץ'), t('statsInternationalFunds','קרנות בחו"ל')],
        adminStats.byResearcher.map(r => [r.researcherName, r.totalSubmissions, r.totalAwards, r.israeliFunds, r.internationalFunds])
      ) : '';

      const globalDeptTable = adminStats.byDepartment.length > 0 ? buildTableHtml(
        [t('statsDepartment','מחלקה'), t('statsTotalSubmissions','הגשות'), t('statsTotalAwards','זכיות'), t('statsTotalRejections','דחיות')],
        adminStats.byDepartment.map(r => [r.department, r.totalSubmissions, r.totalAwards, r.totalRejections])
      ) : '';

      const globalFundTable = adminStats.byFund.length > 0 ? buildTableHtml(
        [t('statsFund','קרן'), t('statsTotalSubmissions','הגשות'), t('statsTotalAwards','זכיות'), t('statsTotalRejections','דחיות')],
        adminStats.byFund.map(r => [r.fundName, r.totalSubmissions, r.totalAwards, r.totalRejections])
      ) : '';

      const globalYearTable = adminStats.byYear.length > 0 ? buildTableHtml(
        [t('statsYear','שנה'), t('statsTotalSubmissions','הגשות'), t('statsTotalAwards','זכיות'), t('statsTotalRejections','דחיות')],
        adminStats.byYear.map(r => [r.year, r.totalSubmissions, r.totalAwards, r.totalRejections])
      ) : '';

      const divider = `<hr style="border:none;border-top:2pt solid #555;margin:20pt 0 14pt;"/>`;

      htmlBody = `
        <div class="doc-header">
          <p class="doc-title-he">${escapeHtml(title)}</p>
        </div>

        ${researcherSection ? `
          ${researcherSection}
          ${divider}
          <h2 style="margin:0 0 10pt;font-size:13pt;">${escapeHtml(t('globalStats', 'סטטיסטיקות כלליות'))}</h2>
        ` : ''}

        ${globalResearcherTable ? `
        <div class="section">
          <h2>${escapeHtml(t('statsByResearcher', 'סטטיסטיקות לפי חוקר'))}</h2>
          ${globalResearcherTable}
        </div>` : ''}

        ${globalDeptTable ? `
        <div class="section">
          <h2>${escapeHtml(t('statsByDepartment', 'סטטיסטיקות לפי מחלקה'))}</h2>
          ${globalDeptTable}
        </div>` : ''}

        ${globalFundTable ? `
        <div class="section">
          <h2>${escapeHtml(t('statsByFund', 'סטטיסטיקות לפי קרן'))}</h2>
          ${globalFundTable}
        </div>` : ''}

        ${globalYearTable ? `
        <div class="section">
          <h2>${escapeHtml(t('statsByYear', 'סה"כ הגשות/זכיות/דחיות בשנה'))}</h2>
          ${globalYearTable}
          <div style="margin-top:12pt;padding:10pt;background:#f0f0f0;border:1pt solid #ccc;">
            <p><strong>${escapeHtml(t('statsNumberOfYears','מספר שנים'))}:</strong> ${adminStats.totalYears}</p>
            <p><strong>${escapeHtml(t('statsAvgSubmissionsPerYear','ממוצע הגשות לשנה'))}:</strong> ${adminStats.avgSubmissionsPerYear}</p>
            <p><strong>${escapeHtml(t('statsAvgAwardsPerYear','ממוצע זכיות לשנה'))}:</strong> ${adminStats.avgAwardsPerYear}</p>
            <p><strong>${escapeHtml(t('statsAvgRejectionsPerYear','ממוצע דחיות לשנה'))}:</strong> ${adminStats.avgRejectionsPerYear}</p>
          </div>
        </div>` : ''}

        <div class="muted">${escapeHtml(generatedAt)}</div>
      `;
    } else if (!isAdmin() && researcherStats) {
      title = t('myStatistics', 'הסטטיסטיקות שלי');

      const summaryTable = buildTableHtml(
        [t('statistic', 'סטטיסטיקה'), t('value', 'ערך')],
        [
          [t('statsTotalSubmissions', 'סה"כ הגשות'), researcherStats.totalSubmissions],
          [t('statsTotalAwards', 'סה"כ זכיות'), researcherStats.totalAwards],
          [t('statsTotalRejections', 'סה"כ דחיות'), researcherStats.totalRejections],
          [t('statsIsraeliFunds', 'קרנות בארץ'), researcherStats.israeliFunds],
          [t('statsInternationalFunds', 'קרנות בחו"ל'), researcherStats.internationalFunds],
          [t('statsYearsCount', 'מספר שנים'), researcherStats.allYears.length],
          [t('statsAllYears', 'שנים פעילות'), researcherStats.allYears.join(', ')],
        ]
      );

      // Submissions and awards by year (with rejections)
      const yearTable = researcherStats.byYear.length > 0 ? buildTableHtml(
        [t('statsYear', 'שנה'), t('statsTotalSubmissions', 'הגשות'), t('statsTotalAwards', 'זכיות'), t('statsTotalRejections', 'דחיות')],
        researcherStats.byYear.map(r => [r.year, r.totalSubmissions, r.totalAwards, r.totalRejections])
      ) : '';

      // Fund breakdown — group filteredResearch by fundName
      const fundMap = {};
      filteredResearch.forEach(r => {
        const fund = r.fundName || t('notSpecified', 'לא צוין');
        if (!fundMap[fund]) fundMap[fund] = { submissions: 0, awards: 0, rejections: 0 };
        fundMap[fund].submissions += 1;
        if (r.status === 'awarded') fundMap[fund].awards += 1;
        if (r.status === 'rejected') fundMap[fund].rejections += 1;
      });
      const fundRows = Object.entries(fundMap).sort((a, b) => b[1].submissions - a[1].submissions);
      const fundTable = fundRows.length > 0 ? buildTableHtml(
        [t('statsFund', 'קרן'), t('statsTotalSubmissions', 'הגשות'), t('statsTotalAwards', 'זכיות'), t('statsTotalRejections', 'דחיות')],
        fundRows.map(([fund, s]) => [fund, s.submissions, s.awards, s.rejections])
      ) : '';

      htmlBody = `
        <div class="doc-header">
          <p class="doc-title-he">${escapeHtml(title)}</p>
        </div>

        <div class="section">
          <h2>${escapeHtml(t('statsResearcherSection', 'סטטיסטיקות חוקר'))}</h2>
          ${summaryTable}
        </div>

        ${yearTable ? `
        <div class="section">
          <h2>${escapeHtml(t('statsByYear', 'הגשות וזכיות לפי שנה'))}</h2>
          ${yearTable}
        </div>` : ''}

        ${fundTable ? `
        <div class="section">
          <h2>${escapeHtml(t('statsByFund', 'חלוקה לפי קרנות'))}</h2>
          ${fundTable}
        </div>` : ''}

        <div class="muted">${escapeHtml(generatedAt)}</div>
      `;
    } else {
      return;
    }

    exportPrintableHtmlToPdf({ title, htmlBody, dir, lang });
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h1 style={{ margin: 0 }}>
            {isAdmin() ? t('adminStatistics', 'סטטיסטיקות רשות המחקר') : t('myStatistics', 'הסטטיסטיקות שלי')}
          </h1>
          {(adminStats || researcherStats) && (
            <button
              type="button"
              onClick={handleExportPDF}
              style={{
                padding: '10px 20px',
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              {t('exportPdf', 'ייצוא ל-PDF')}
            </button>
          )}
        </div>
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
              selectedResearcherForStats={statsResearcher}
              onResearcherChange={setStatsResearcher}
              yearFilterType={statsYearFilterType}
              onYearFilterTypeChange={setStatsYearFilterType}
              researcherYearRange={statsYearRange}
              onYearRangeChange={setStatsYearRange}
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
