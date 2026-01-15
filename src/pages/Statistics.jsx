import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Page.css';
import './Research.css';

// Helper function to identify if a fund is Israeli or international
const isIsraeliFund = (fundName) => {
  if (!fundName) return false;
  
  const israeliFunds = [
    'הקרן הלאומית למדע ISF',
    'הקרן הדו-לאומית למדע BSF',
    'הקרן הגרמנית-ישראלית למחקר ופיתוח GIF',
    'משרד החדשנות, המדע והטכנולוגיה MOST',
    'משרד הבריאות MOH',
    'הקרן לחקר הסרטן ICRF',
    'הקרן הדו-לאומית למחקר ופיתוח חקלאי BARD',
    'שיתוף פעולה גרמניה-ישראל DIP',
    'רשות המים - המדען הראשי',
    'רשות האנרגיה והתשתיות - המדען הראשי',
    'המשרד לאיכות הסביבה - המדען הראשי',
    'משרד החקלאות וההתיישבות הכפרית',
    'מכון וולקני',
    'האגודה למלחמה בסרטן',
    'אלו"ט',
    'קרן "שלם"',
    'קרן קיימת לישראל קק"ל',
    'מו"פ מדבר יהודה וים המלח',
    'המרכז למחקרי סביבה וקיימות',
    'קרן פזי',
    'מכון אלי הורביץ לניהול אסטרטגי',
    'מרכז לדאטה ובינה מלאכותית - אונ\' תל אביב'
  ];
  
  return israeliFunds.some(fund => fundName.includes(fund));
};

const isInternationalFund = (fundName) => {
  if (!fundName) return false;
  
  const internationalFunds = [
    'האיחוד האירופי Horizon',
    'המכון הלאומי לבריאות (ארה"ב) - NIH',
    'הקרן הגרמנית למחקר DFG',
    'HFSP - Human Frontiers Science Project',
    'Volfswagen Stiftung',
    'Spencer Foundation for Research in Education'
  ];
  
  return internationalFunds.some(fund => fundName.includes(fund));
};

// Helper function to convert Firestore Timestamp to date string
const toDateString = (timestamp) => {
  if (!timestamp) return '';
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString().split('T')[0];
  }
  if (timestamp && timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString().split('T')[0];
  }
  return String(timestamp);
};

// Helper function to extract year from date
const getYear = (dateString) => {
  if (!dateString) return null;
  try {
    return new Date(dateString).getFullYear();
  } catch {
    return null;
  }
};

// Helper function to extract academic year
const getAcademicYear = (academicYearString) => {
  return academicYearString || null;
};

const Statistics = () => {
  const { isAdmin, user, userRole } = useAuth();
  const [researchData, setResearchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters for admin view
  const [selectedResearcher, setSelectedResearcher] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedFund, setSelectedFund] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [yearRange, setYearRange] = useState({ start: '', end: '' });
  
  // Filter for researcher chart (separate from main filters)
  const [selectedResearcherForChart, setSelectedResearcherForChart] = useState('all');
  const [researcherSearchTerm, setResearcherSearchTerm] = useState('');
  
  // Filter for researcher statistics table (separate from chart)
  const [selectedResearcherForStats, setSelectedResearcherForStats] = useState('all');
  const [researcherStatsSearchTerm, setResearcherStatsSearchTerm] = useState('');
  const [yearFilterType, setYearFilterType] = useState('all'); // 'all' or 'range'
  const [researcherYearRange, setResearcherYearRange] = useState({ start: '', end: '' });
  const [expandedStatBox, setExpandedStatBox] = useState(null); // 'submissions', 'awards', 'years', etc.

  // Fetch research data from Firestore
  useEffect(() => {
    const fetchResearch = async () => {
      if (!db) {
        console.error('Firestore database not initialized');
        setError('מסד הנתונים לא מאותחל');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      
      try {
        const researchRef = collection(db, 'researchProposals');
        let querySnapshot;

        // Filter by researcher if not admin
        if (userRole === 'RESEARCHER' && user?.id) {
          try {
            const q = query(
              researchRef,
              where('researcherId', '==', user.id),
              orderBy('createdAt', 'desc')
            );
            querySnapshot = await getDocs(q);
          } catch (orderByError) {
            const q = query(
              researchRef,
              where('researcherId', '==', user.id)
            );
            querySnapshot = await getDocs(q);
          }
    } else {
          try {
            const q = query(researchRef, orderBy('createdAt', 'desc'));
            querySnapshot = await getDocs(q);
          } catch (orderByError) {
            querySnapshot = await getDocs(researchRef);
          }
        }

        const researchList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          
          return {
            id: doc.id,
            title: data.projectTitle || data.title || 'ללא כותרת',
            researcherName: data.researcherName || data.researcher || 'חוקר',
            researcherId: data.researcherId,
            status: data.status || 'pending',
            hasPatent: data.hasPatent || false,
            submissionDate: toDateString(data.submissionDate || data.createdAt),
            fundName: data.fundName || '',
            academicYear: data.academicYear || '',
            researchStartDate: toDateString(data.researchStartDate),
            researchEndDate: toDateString(data.researchEndDate),
            department: data.department || '', // אם יש שדה מחלקה
          };
        });

        setResearchData(researchList);
      } catch (err) {
        console.error('Error fetching research:', err);
        setError('שגיאה בטעינת נתונים');
        setResearchData([]);
      } finally {
        setLoading(false);
      }
    };

    if (userRole && user) {
      fetchResearch();
    }
  }, [userRole, user?.id]);

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
          <p>טוען נתונים...</p>
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
          {isAdmin() ? 'סטטיסטיקות רשות המחקר' : 'הסטטיסטיקות שלי'}
        </h1>
        <p className="welcome-text">
          {isAdmin() 
            ? 'סקירה מפורטת של כל המחקרים במכללה עם חיתוכים שונים'
            : 'סקירה של המחקרים שלך עם חיתוכים שונים'}
        </p>


        {/* Researcher Statistics */}
        {!isAdmin() && researcherStats && (() => {
          const researcherResearch = filteredResearch;
          const submissions = researcherResearch;
          const awards = researcherResearch.filter(r => r.status === 'awarded');
          const rejections = researcherResearch.filter(r => r.status === 'rejected');
          
          return (
            <>
              <div className="statistics-section">
                <h2>📊 סטטיסטיקות חוקר</h2>
                <div className="stats-grid">
                  <div 
                    className="stat-box"
                    onClick={() => setExpandedStatBox(expandedStatBox === 'submissions' ? null : 'submissions')}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: expandedStatBox === 'submissions' ? 'scale(1.05)' : 'scale(1)' }}
                  >
                    <div className="stat-box-value">{researcherStats.totalSubmissions}</div>
                    <div className="stat-box-label">סה"כ הגשות</div>
                    {expandedStatBox === 'submissions' && (
                      <div style={{ marginTop: '15px', padding: '15px', background: '#fff', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>רשימת הגשות:</h4>
                        {submissions.length > 0 ? (
                          <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
                            {submissions.map((r, idx) => (
                              <li key={idx} style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                                <strong>{r.title || r.projectTitle || 'ללא כותרת'}</strong> - {r.fundName || 'ללא קרן'} ({getYear(r.submissionDate) || 'ללא תאריך'})
                                <br />
                                <small style={{ color: '#666' }}>
                                  סטטוס: {r.status === 'awarded' ? 'זכייה' : r.status === 'rejected' ? 'דחייה' : 'בהמתנה'}
                                </small>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ textAlign: 'right', color: '#666' }}>אין הגשות</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className="stat-box"
                    onClick={() => setExpandedStatBox(expandedStatBox === 'awards' ? null : 'awards')}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: expandedStatBox === 'awards' ? 'scale(1.05)' : 'scale(1)' }}
                  >
                    <div className="stat-box-value">{researcherStats.totalAwards}</div>
                    <div className="stat-box-label">סה"כ זכיות</div>
                    {expandedStatBox === 'awards' && (
                      <div style={{ marginTop: '15px', padding: '15px', background: '#fff', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>רשימת זכיות:</h4>
                        {awards.length > 0 ? (
                          <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
                            {awards.map((r, idx) => (
                              <li key={idx} style={{ marginBottom: '8px', padding: '8px', background: '#d4edda', borderRadius: '4px' }}>
                                <strong>{r.title || r.projectTitle || 'ללא כותרת'}</strong> - {r.fundName || 'ללא קרן'} ({getYear(r.submissionDate) || 'ללא תאריך'})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ textAlign: 'right', color: '#666' }}>אין זכיות</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className="stat-box"
                    onClick={() => setExpandedStatBox(expandedStatBox === 'years' ? null : 'years')}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: expandedStatBox === 'years' ? 'scale(1.05)' : 'scale(1)' }}
                  >
                    <div className="stat-box-value">{researcherStats.allYears.length}</div>
                    <div className="stat-box-label">מספר שנים</div>
                    {expandedStatBox === 'years' && (
                      <div style={{ marginTop: '15px', padding: '15px', background: '#fff', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>כל השנים:</h4>
                        <p style={{ textAlign: 'right' }}>{researcherStats.allYears.join(', ')}</p>
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className="stat-box"
                    onClick={() => setExpandedStatBox(expandedStatBox === 'israeliFunds' ? null : 'israeliFunds')}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: expandedStatBox === 'israeliFunds' ? 'scale(1.05)' : 'scale(1)' }}
                  >
                    <div className="stat-box-value">{researcherStats.israeliFunds}</div>
                    <div className="stat-box-label">קרנות בארץ</div>
                    {expandedStatBox === 'israeliFunds' && (
                      <div style={{ marginTop: '15px', padding: '15px', background: '#fff', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>קרנות בארץ:</h4>
                        {(() => {
                          const israeliResearch = researcherResearch.filter(r => isIsraeliFund(r.fundName));
                          const fundGroups = {};
                          israeliResearch.forEach(r => {
                            if (!fundGroups[r.fundName]) fundGroups[r.fundName] = [];
                            fundGroups[r.fundName].push(r);
                          });
                          return Object.keys(fundGroups).length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
                              {Object.entries(fundGroups).map(([fundName, researchList]) => (
                                <li key={fundName} style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                                  <strong>{fundName}</strong> ({researchList.length} מחקרים)
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ textAlign: 'right', color: '#666' }}>אין קרנות בארץ</p>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className="stat-box"
                    onClick={() => setExpandedStatBox(expandedStatBox === 'internationalFunds' ? null : 'internationalFunds')}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: expandedStatBox === 'internationalFunds' ? 'scale(1.05)' : 'scale(1)' }}
                  >
                    <div className="stat-box-value">{researcherStats.internationalFunds}</div>
                    <div className="stat-box-label">קרנות בחו"ל</div>
                    {expandedStatBox === 'internationalFunds' && (
                      <div style={{ marginTop: '15px', padding: '15px', background: '#fff', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>קרנות בחו"ל:</h4>
                        {(() => {
                          const internationalResearch = researcherResearch.filter(r => isInternationalFund(r.fundName));
                          const fundGroups = {};
                          internationalResearch.forEach(r => {
                            if (!fundGroups[r.fundName]) fundGroups[r.fundName] = [];
                            fundGroups[r.fundName].push(r);
                          });
                          return Object.keys(fundGroups).length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
                              {Object.entries(fundGroups).map(([fundName, researchList]) => (
                                <li key={fundName} style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                                  <strong>{fundName}</strong> ({researchList.length} מחקרים)
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ textAlign: 'right', color: '#666' }}>אין קרנות בחו"ל</p>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Charts for Researcher - Moved to bottom */}
              <div className="statistics-section" style={{ marginTop: '40px' }}>
                <h2>📈 גרפים</h2>
              
              {/* Bar Chart - Submissions vs Awards vs Rejections */}
              <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginBottom: '20px', textAlign: 'right' }}>הגשות, זכיות ודחיות</h3>
                <ResponsiveContainer width="100%" height={300}>
                  {(() => {
                    const maxValue = Math.max(researcherStats.totalSubmissions, researcherStats.totalAwards, researcherStats.totalRejections, 1);
                    const ticks = Array.from({ length: Math.min(maxValue + 2, 20) }, (_, i) => i);
                    
                    return (
                      <BarChart data={[
                        { name: 'הגשות', value: researcherStats.totalSubmissions },
                        { name: 'זכיות', value: researcherStats.totalAwards },
                        { name: 'דחיות', value: researcherStats.totalRejections }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis 
                          tickFormatter={(value) => Math.round(value)} 
                          domain={[0, maxValue + 1]}
                          allowDecimals={false}
                          ticks={ticks}
                        />
                        <Tooltip formatter={(value) => Math.round(value)} />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    );
                  })()}
                </ResponsiveContainer>
              </div>

              {/* Pie Chart - Status Distribution */}
              {(researcherStats.totalSubmissions > 0) && (
                <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ marginBottom: '20px', textAlign: 'right' }}>חלוקה לפי סטטוס</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'זכיות', value: researcherStats.totalAwards },
                          { name: 'דחיות', value: researcherStats.totalRejections },
                          { name: 'בהמתנה', value: researcherStats.totalSubmissions - researcherStats.totalAwards - researcherStats.totalRejections }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#82ca9d" />
                        <Cell fill="#ffc658" />
                        <Cell fill="#8884d8" />
                      </Pie>
                      <Tooltip formatter={(value) => Math.round(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Line Chart - Submissions/Awards by Year */}
              {researcherStats.byYear && researcherStats.byYear.length > 0 && (
                <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ marginBottom: '20px', textAlign: 'right' }}>הגשות וזכיות לפי שנים</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={researcherStats.byYear.sort((a, b) => a.year - b.year)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis 
                        tickFormatter={(value) => Math.round(value)} 
                        domain={[0, 'auto']}
                        allowDecimals={false}
                        interval={0}
                      />
                      <Tooltip formatter={(value) => Math.round(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="totalSubmissions" stroke="#8884d8" name="הגשות" strokeWidth={2} />
                      <Line type="monotone" dataKey="totalAwards" stroke="#82ca9d" name="זכיות" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pie Chart - Funds Distribution */}
              {(researcherStats.israeliFunds > 0 || researcherStats.internationalFunds > 0) && (
                <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ marginBottom: '20px', textAlign: 'right' }}>חלוקת קרנות</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'קרנות בארץ', value: researcherStats.israeliFunds },
                          { name: 'קרנות בחו"ל', value: researcherStats.internationalFunds }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#8884d8" />
                        <Cell fill="#82ca9d" />
                      </Pie>
                      <Tooltip formatter={(value) => Math.round(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              </div>
            </>
          );
        })()}

        {/* Admin Statistics */}
        {isAdmin() && adminStats && (
          <>
            {/* Statistics by Researcher */}
            <div className="statistics-section">
              <h2>📊 סטטיסטיקות לפי חוקר</h2>
              
              {(() => {
                // Filter researchers based on search term
                const filteredResearchersForStats = uniqueResearchers.filter(researcher =>
                  researcher.toLowerCase().includes(researcherStatsSearchTerm.toLowerCase())
                );
                
                // Get base researcher data
                const baseResearcherStat = selectedResearcherForStats !== 'all' 
                  ? adminStats.byResearcher.find(r => r.researcherName === selectedResearcherForStats)
                  : null;
                
                // Filter by year range if selected
                let selectedResearcherStat = null;
                if (baseResearcherStat) {
                  if (yearFilterType === 'all') {
                    selectedResearcherStat = baseResearcherStat;
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
                    
                    selectedResearcherStat = {
                      ...baseResearcherStat,
                      totalSubmissions: researcherResearch.length,
                      totalAwards: researcherResearch.filter(r => r.status === 'awarded').length,
                      allYears: filteredYears,
                      allAcademicYears: filteredAcademicYears,
                      israeliFunds: researcherResearch.filter(r => isIsraeliFund(r.fundName)).length,
                      internationalFunds: researcherResearch.filter(r => isInternationalFund(r.fundName)).length,
                    };
                  } else {
                    selectedResearcherStat = baseResearcherStat;
                  }
                }
                
                return (
                  <>
                    {/* Search Input and Dropdown */}
                    <div style={{ marginBottom: '20px', direction: 'rtl' }}>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '15px' }}>
                        <input
                          type="text"
                          placeholder="חפש חוקר..."
                          value={researcherStatsSearchTerm}
                          onChange={(e) => {
                            setResearcherStatsSearchTerm(e.target.value);
                            // Auto-select if only one result
                            if (e.target.value && filteredResearchersForStats.length === 1) {
                              setSelectedResearcherForStats(filteredResearchersForStats[0]);
                            }
                          }}
                          style={{
                            width: '150px',
                            padding: '12px 6px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            fontSize: '15px',
                            direction: 'rtl'
                          }}
                        />
                        
                        <select 
                          value={selectedResearcherForStats} 
                          onChange={(e) => {
                            setSelectedResearcherForStats(e.target.value);
                            if (e.target.value !== 'all') {
                              setResearcherStatsSearchTerm(e.target.value);
                            } else {
                              setResearcherStatsSearchTerm('');
                            }
                          }}
                          style={{ 
                            width: '150px',
                            padding: '12px 6px', 
                            borderRadius: '4px', 
                            border: '1px solid #ddd',
                            fontSize: '15px',
                            direction: 'rtl'
                          }}
                        >
                          <option value="all">בחר חוקר...</option>
                          {filteredResearchersForStats.length > 0 ? (
                            filteredResearchersForStats.map(researcher => (
                              <option key={researcher} value={researcher}>{researcher}</option>
                            ))
                          ) : (
                            <option value="all" disabled>לא נמצאו תוצאות</option>
                          )}
                        </select>
                      </div>
                      
                      {researcherStatsSearchTerm && filteredResearchersForStats.length === 0 && (
                        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px', textAlign: 'right' }}>
                          לא נמצאו חוקרים התואמים לחיפוש
                        </p>
                      )}
                    </div>
                    
                    {/* Year Filter - Simple Design */}
                    {selectedResearcherForStats !== 'all' && baseResearcherStat && (
                      <div style={{ 
                        marginBottom: '20px', 
                        padding: '15px', 
                        background: '#f5f5f5', 
                        borderRadius: '8px',
                        direction: 'rtl'
                      }}>
                        <label style={{ 
                          marginLeft: '10px', 
                          fontSize: '14px', 
                          fontWeight: 'bold',
                          marginBottom: '10px',
                          display: 'block'
                        }}>
                          חיתוך לפי שנים:
                        </label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              setYearFilterType('all');
                              setResearcherYearRange({ start: '', end: '' });
                            }}
                            style={{
                              padding: '8px 15px',
                              borderRadius: '6px',
                              border: yearFilterType === 'all' ? '2px solid #667eea' : '2px solid #ddd',
                              background: yearFilterType === 'all' ? '#667eea' : '#fff',
                              color: yearFilterType === 'all' ? '#fff' : '#333',
                              fontSize: '14px',
                              cursor: 'pointer',
                              fontWeight: yearFilterType === 'all' ? 'bold' : 'normal'
                            }}
                          >
                            כל השנים
                          </button>
                          <span style={{ color: '#666' }}>או</span>
                          <input
                            type="number"
                            placeholder="משנה"
                            value={researcherYearRange.start}
                            onChange={(e) => {
                              setResearcherYearRange({ ...researcherYearRange, start: e.target.value });
                              if (e.target.value && researcherYearRange.end) {
                                setYearFilterType('range');
                              }
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #ddd',
                              fontSize: '14px',
                              width: '100px',
                              direction: 'rtl'
                            }}
                          />
                          <span style={{ color: '#666' }}>עד</span>
                          <input
                            type="number"
                            placeholder="עד שנה"
                            value={researcherYearRange.end}
                            onChange={(e) => {
                              setResearcherYearRange({ ...researcherYearRange, end: e.target.value });
                              if (researcherYearRange.start && e.target.value) {
                                setYearFilterType('range');
                              }
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #ddd',
                              fontSize: '14px',
                              width: '100px',
                              direction: 'rtl'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Display selected researcher statistics */}
                    {selectedResearcherStat ? (() => {
                      // Get filtered research data for details
                      let filteredResearchData = filteredResearch.filter(r => 
                        r.researcherName === selectedResearcherForStats
                      );
                      
                      if (yearFilterType === 'range' && researcherYearRange.start && researcherYearRange.end) {
                        const startYear = parseInt(researcherYearRange.start);
                        const endYear = parseInt(researcherYearRange.end);
                        filteredResearchData = filteredResearchData.filter(r => {
                          const year = getYear(r.submissionDate);
                          return year >= startYear && year <= endYear;
                        });
                      }
                      
                      const submissions = filteredResearchData;
                      const awards = filteredResearchData.filter(r => r.status === 'awarded');
                      
                      return (
                        <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
                          <h3 style={{ marginBottom: '20px', textAlign: 'right', color: '#333' }}>
                            נתונים עבור: {selectedResearcherStat.researcherName}
                          </h3>
                          <div className="stats-grid">
                            <div 
                              className="stat-box" 
                              onClick={() => setExpandedStatBox(expandedStatBox === 'submissions' ? null : 'submissions')}
                              style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: expandedStatBox === 'submissions' ? 'scale(1.05)' : 'scale(1)' }}
                            >
                              <div className="stat-box-value">{selectedResearcherStat.totalSubmissions}</div>
                              <div className="stat-box-label">סה"כ הגשות</div>
                              {expandedStatBox === 'submissions' && (
                                <div style={{ marginTop: '15px', padding: '15px', background: '#fff', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                  <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>רשימת הגשות:</h4>
                                  {submissions.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
                                      {submissions.map((r, idx) => (
                                        <li key={idx} style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                                          <strong>{r.title}</strong> - {r.fundName} ({getYear(r.submissionDate) || 'ללא תאריך'})
                                          <br />
                                          <small style={{ color: '#666' }}>
                                            סטטוס: {r.status === 'awarded' ? 'זכייה' : r.status === 'rejected' ? 'דחייה' : 'בהמתנה'}
                                          </small>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p style={{ textAlign: 'right', color: '#666' }}>אין הגשות</p>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div 
                              className="stat-box"
                              onClick={() => setExpandedStatBox(expandedStatBox === 'awards' ? null : 'awards')}
                              style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: expandedStatBox === 'awards' ? 'scale(1.05)' : 'scale(1)' }}
                            >
                              <div className="stat-box-value">{selectedResearcherStat.totalAwards}</div>
                              <div className="stat-box-label">סה"כ זכיות</div>
                              {expandedStatBox === 'awards' && (
                                <div style={{ marginTop: '15px', padding: '15px', background: '#fff', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                  <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>רשימת זכיות:</h4>
                                  {awards.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
                                      {awards.map((r, idx) => (
                                        <li key={idx} style={{ marginBottom: '8px', padding: '8px', background: '#d4edda', borderRadius: '4px' }}>
                                          <strong>{r.title}</strong> - {r.fundName} ({getYear(r.submissionDate) || 'ללא תאריך'})
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p style={{ textAlign: 'right', color: '#666' }}>אין זכיות</p>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div 
                              className="stat-box"
                              onClick={() => setExpandedStatBox(expandedStatBox === 'years' ? null : 'years')}
                              style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: expandedStatBox === 'years' ? 'scale(1.05)' : 'scale(1)' }}
                            >
                              <div className="stat-box-value">{selectedResearcherStat.allYears.length}</div>
                              <div className="stat-box-label">מספר שנים</div>
                              {expandedStatBox === 'years' && (
                                <div style={{ marginTop: '15px', padding: '15px', background: '#fff', borderRadius: '8px' }}>
                                  <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>כל השנים:</h4>
                                  <p style={{ textAlign: 'right' }}>{selectedResearcherStat.allYears.join(', ')}</p>
                                </div>
                              )}
                            </div>
                            
                            <div 
                              className="stat-box"
                              onClick={() => setExpandedStatBox(expandedStatBox === 'israeliFunds' ? null : 'israeliFunds')}
                              style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: expandedStatBox === 'israeliFunds' ? 'scale(1.05)' : 'scale(1)' }}
                            >
                              <div className="stat-box-value">{selectedResearcherStat.israeliFunds}</div>
                              <div className="stat-box-label">קרנות בארץ</div>
                              {expandedStatBox === 'israeliFunds' && (
                                <div style={{ marginTop: '15px', padding: '15px', background: '#fff', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                  <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>קרנות בארץ:</h4>
                                  {(() => {
                                    const israeliResearch = filteredResearchData.filter(r => isIsraeliFund(r.fundName));
                                    const fundGroups = {};
                                    israeliResearch.forEach(r => {
                                      if (!fundGroups[r.fundName]) fundGroups[r.fundName] = [];
                                      fundGroups[r.fundName].push(r);
                                    });
                                    return Object.keys(fundGroups).length > 0 ? (
                                      <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
                                        {Object.entries(fundGroups).map(([fund, items], idx) => (
                                          <li key={idx} style={{ marginBottom: '10px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                                            <strong>{fund}</strong> ({items.length} מחקרים)
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p style={{ textAlign: 'right', color: '#666' }}>אין קרנות בארץ</p>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                            
                            <div 
                              className="stat-box"
                              onClick={() => setExpandedStatBox(expandedStatBox === 'internationalFunds' ? null : 'internationalFunds')}
                              style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: expandedStatBox === 'internationalFunds' ? 'scale(1.05)' : 'scale(1)' }}
                            >
                              <div className="stat-box-value">{selectedResearcherStat.internationalFunds}</div>
                              <div className="stat-box-label">קרנות בחו"ל</div>
                              {expandedStatBox === 'internationalFunds' && (
                                <div style={{ marginTop: '15px', padding: '15px', background: '#fff', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                  <h4 style={{ marginBottom: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>קרנות בחו"ל:</h4>
                                  {(() => {
                                    const internationalResearch = filteredResearchData.filter(r => isInternationalFund(r.fundName));
                                    const fundGroups = {};
                                    internationalResearch.forEach(r => {
                                      if (!fundGroups[r.fundName]) fundGroups[r.fundName] = [];
                                      fundGroups[r.fundName].push(r);
                                    });
                                    return Object.keys(fundGroups).length > 0 ? (
                                      <ul style={{ listStyle: 'none', padding: 0, direction: 'rtl', textAlign: 'right' }}>
                                        {Object.entries(fundGroups).map(([fund, items], idx) => (
                                          <li key={idx} style={{ marginBottom: '10px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                                            <strong>{fund}</strong> ({items.length} מחקרים)
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p style={{ textAlign: 'right', color: '#666' }}>אין קרנות בחו"ל</p>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
            </div>
            </div>
                      );
                    })() : (
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
                  </>
                );
              })()}
            </div>

            {/* Statistics by Department */}
            {adminStats.byDepartment.length > 0 && (
              <div className="statistics-section">
                <h2>📊 סטטיסטיקות לפי מחלקה</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                    <thead>
                      <tr style={{ background: '#f0f0f0' }}>
                        <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>מחלקה</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>סה"כ הגשות</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>סה"כ זכיות</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>סה"כ דחיות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.byDepartment.map((stat, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                          <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.department}</td>
                          <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.totalSubmissions}</td>
                          <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.totalAwards}</td>
                          <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.totalRejections}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
          </div>
        </div>
            )}

            {/* Statistics by Fund */}
        <div className="statistics-section">
              <h2>📊 סטטיסטיקות לפי קרן</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>קרן</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>סה"כ הגשות</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>סה"כ זכיות</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>סה"כ דחיות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminStats.byFund.map((stat, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.fundName}</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.totalSubmissions}</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.totalAwards}</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.totalRejections}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Statistics per Year */}
            <div className="statistics-section">
              <h2>📊 סה"כ הגשות/זכיות/דחיות בשנה</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>שנה</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>סה"כ הגשות</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>סה"כ זכיות</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>סה"כ דחיות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminStats.byYear.map((stat, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.year}</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.totalSubmissions}</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.totalAwards}</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>{stat.totalRejections}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div style={{ marginTop: '20px', padding: '15px', background: '#e8f4f8', borderRadius: '8px' }}>
                <h3>ממוצעים:</h3>
                <p><strong>מספר שנים:</strong> {adminStats.totalYears}</p>
                <p><strong>ממוצע הגשות לשנה:</strong> {adminStats.avgSubmissionsPerYear}</p>
                <p><strong>ממוצע זכיות לשנה:</strong> {adminStats.avgAwardsPerYear}</p>
                <p><strong>ממוצע דחיות לשנה:</strong> {adminStats.avgRejectionsPerYear}</p>
              </div>
            </div>

            {/* Charts for Admin - Moved to bottom */}
            <div className="statistics-section" style={{ marginTop: '40px' }}>
              <h2>📈 גרפים</h2>
              
              {/* Pie Chart - Total Submissions/Awards/Rejections */}
              {adminStats.byYear.length > 0 && (() => {
                const totalSubmissions = adminStats.byYear.reduce((sum, y) => sum + y.totalSubmissions, 0);
                const totalAwards = adminStats.byYear.reduce((sum, y) => sum + y.totalAwards, 0);
                const totalRejections = adminStats.byYear.reduce((sum, y) => sum + y.totalRejections, 0);
                
                return (
                  <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginBottom: '20px', textAlign: 'right' }}>חלוקה כוללת: הגשות/זכיות/דחיות</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'הגשות', value: totalSubmissions },
                            { name: 'זכיות', value: totalAwards },
                            { name: 'דחיות', value: totalRejections }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#8884d8" />
                          <Cell fill="#82ca9d" />
                          <Cell fill="#ffc658" />
                        </Pie>
                        <Tooltip formatter={(value) => Math.round(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}

              {/* Bar Chart - Funds Distribution */}
              {adminStats.byFund.length > 0 && (
                <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ marginBottom: '20px', textAlign: 'right' }}>חלוקת הגשות לפי קרן</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={adminStats.byFund
                        .sort((a, b) => b.totalSubmissions - a.totalSubmissions)
                        .slice(0, 15)
                        .map(f => ({
                          name: f.fundName.length > 20 ? f.fundName.substring(0, 20) + '...' : f.fundName,
                          הגשות: f.totalSubmissions
                        }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
                      <YAxis 
                        tickFormatter={(value) => Math.round(value)} 
                        domain={[0, 'auto']}
                        allowDecimals={false}
                        interval={0}
                      />
                      <Tooltip formatter={(value) => Math.round(value)} />
                      <Bar dataKey="הגשות" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Researcher Statistics Chart with Dropdown and Search */}
              {adminStats.byResearcher.length > 0 && (() => {
                // Filter researchers based on search term
                const filteredResearchers = uniqueResearchers.filter(researcher =>
                  researcher.toLowerCase().includes(researcherSearchTerm.toLowerCase())
                );
                
                return (
                  <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, textAlign: 'right' }}>הגשות וזכיות לפי חוקר</h3>
                      </div>
                      
                      {/* Search Input and Dropdown side by side */}
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', direction: 'rtl' }}>
                        {/* Search Input */}
                        <input
                          type="text"
                          placeholder="חפש חוקר..."
                          value={researcherSearchTerm}
                          onChange={(e) => {
                            setResearcherSearchTerm(e.target.value);
                            // Auto-select if only one result
                            if (e.target.value && filteredResearchers.length === 1) {
                              setSelectedResearcherForChart(filteredResearchers[0]);
                            }
                          }}
                          style={{
                            width: '150px',
                            padding: '12px 6px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            fontSize: '15px',
                            direction: 'rtl'
                          }}
                        />
                        
                        {/* Dropdown with filtered results */}
                        <select 
                          value={selectedResearcherForChart} 
                          onChange={(e) => {
                            setSelectedResearcherForChart(e.target.value);
                            if (e.target.value !== 'all') {
                              setResearcherSearchTerm(e.target.value);
                            }
                          }}
                          style={{ 
                            width: '150px',
                            padding: '12px 6px', 
                            borderRadius: '4px', 
                            border: '1px solid #ddd',
                            fontSize: '15px',
                            direction: 'rtl'
                          }}
                        >
                          <option value="all">בחר חוקר...</option>
                          {filteredResearchers.length > 0 ? (
                            filteredResearchers.map(researcher => (
                              <option key={researcher} value={researcher}>{researcher}</option>
                            ))
                          ) : (
                            <option value="all" disabled>לא נמצאו תוצאות</option>
                          )}
                        </select>
                      </div>
                      
                      {researcherSearchTerm && filteredResearchers.length === 0 && (
                        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px', textAlign: 'right' }}>
                          לא נמצאו חוקרים התואמים לחיפוש
                        </p>
                      )}
                    </div>
                  
                  {selectedResearcherForChart !== 'all' ? (
                    (() => {
                      const selectedResearcherData = adminStats.byResearcher.find(r => r.researcherName === selectedResearcherForChart);
                      if (!selectedResearcherData) return null;
                      
                      return (
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart 
                            data={[
                              { 
                                name: selectedResearcherForChart,
                                הגשות: selectedResearcherData.totalSubmissions,
                                זכיות: selectedResearcherData.totalAwards
                              }
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis 
                              tickFormatter={(value) => Math.round(value)} 
                              domain={[0, 'dataMax']}
                              allowDecimals={false}
                            />
                            <Tooltip formatter={(value) => Math.round(value)} />
                            <Legend />
                            <Bar dataKey="הגשות" fill="#8884d8" />
                            <Bar dataKey="זכיות" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()
                  ) : (
                    <div style={{ 
                      padding: '40px', 
                      textAlign: 'center', 
                      color: '#666',
                      fontSize: '18px',
                      background: '#f9f9f9',
                      borderRadius: '8px'
                    }}>
                      אנא בחר חוקר מהתפריט כדי לראות את הגרף
                    </div>
                  )}
                </div>
                );
              })()}

              {/* Bar Chart - Department Statistics */}
              {adminStats.byDepartment.length > 0 && (
                <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ marginBottom: '20px', textAlign: 'right' }}>סטטיסטיקות לפי מחלקה</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={adminStats.byDepartment.map(d => ({
                        name: d.department,
                        הגשות: d.totalSubmissions,
                        זכיות: d.totalAwards,
                        דחיות: d.totalRejections
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis 
                        tickFormatter={(value) => Math.round(value)} 
                        domain={[0, 'auto']}
                        allowDecimals={false}
                        interval={0}
                      />
                      <Tooltip formatter={(value) => Math.round(value)} />
                      <Legend />
                      <Bar dataKey="הגשות" fill="#8884d8" />
                      <Bar dataKey="זכיות" fill="#82ca9d" />
                      <Bar dataKey="דחיות" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Statistics;
