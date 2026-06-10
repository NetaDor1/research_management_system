import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../../context/LanguageContext';
import ResearcherSelector from './ResearcherSelector';

const CHART_DATA_KEYS = {
  submissions: 'submissions',
  awards: 'awards',
  rejections: 'rejections',
};

const AdminCharts = ({ 
  adminStats, 
  uniqueResearchers,
  selectedResearcherForChart,
  researcherSearchTerm,
  onResearcherSearchChange,
  onResearcherSelectChange
}) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const direction = isRTL ? 'rtl' : 'ltr';
  const chartHeadingStyle = { marginBottom: '20px', textAlign };

  const labels = {
    submissions: t('statsSubmissions', 'הגשות'),
    awards: t('statsAwards', 'זכיות'),
    rejections: t('statsRejections', 'דחיות'),
  };

  return (
    <div className="statistics-section" style={{ marginTop: '40px' }}>
      <h2>{t('statsCharts', 'גרפים')}</h2>
      
      {adminStats.byYear.length > 0 && (() => {
        const totalSubmissions = adminStats.byYear.reduce((sum, y) => sum + y.totalSubmissions, 0);
        const totalAwards = adminStats.byYear.reduce((sum, y) => sum + y.totalAwards, 0);
        const totalRejections = adminStats.byYear.reduce((sum, y) => sum + y.totalRejections, 0);
        
        return (
          <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={chartHeadingStyle}>{t('statsOverallDistribution', 'חלוקה כוללת: הגשות/זכיות/דחיות')}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={[
                    { name: labels.submissions, value: totalSubmissions },
                    { name: labels.awards, value: totalAwards },
                    { name: labels.rejections, value: totalRejections }
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

      {adminStats.byFund.length > 0 && (
        <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={chartHeadingStyle}>{t('statsSubmissionsByFund', 'חלוקת הגשות לפי קרן')}</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={adminStats.byFund
                .sort((a, b) => b.totalSubmissions - a.totalSubmissions)
                .slice(0, 15)
                .map(f => ({
                  name: f.fundName.length > 20 ? f.fundName.substring(0, 20) + '...' : f.fundName,
                  [CHART_DATA_KEYS.submissions]: f.totalSubmissions
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
              <Bar dataKey={CHART_DATA_KEYS.submissions} name={labels.submissions} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {adminStats.byResearcher.length > 0 && (
        <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction, marginBottom: '15px' }}>
              <h3 style={{ margin: 0, textAlign }}>{t('statsByResearcherChart', 'הגשות וזכיות לפי חוקר')}</h3>
            </div>
            
            <ResearcherSelector
              uniqueResearchers={uniqueResearchers}
              searchTerm={researcherSearchTerm}
              selectedResearcher={selectedResearcherForChart}
              onSearchChange={onResearcherSearchChange}
              onSelectChange={onResearcherSelectChange}
            />
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
                        [CHART_DATA_KEYS.submissions]: selectedResearcherData.totalSubmissions,
                        [CHART_DATA_KEYS.awards]: selectedResearcherData.totalAwards
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
                    <Bar dataKey={CHART_DATA_KEYS.submissions} name={labels.submissions} fill="#8884d8" />
                    <Bar dataKey={CHART_DATA_KEYS.awards} name={labels.awards} fill="#82ca9d" />
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
              {t('statsSelectResearcherForChart', 'אנא בחר חוקר מהתפריט כדי לראות את הגרף')}
            </div>
          )}
        </div>
      )}

      {adminStats.byDepartment.length > 0 && (
        <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={chartHeadingStyle}>{t('statsDepartmentChart', 'סטטיסטיקות לפי מחלקה')}</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={adminStats.byDepartment.map(d => ({
                name: d.department,
                [CHART_DATA_KEYS.submissions]: d.totalSubmissions,
                [CHART_DATA_KEYS.awards]: d.totalAwards,
                [CHART_DATA_KEYS.rejections]: d.totalRejections
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
              <Bar dataKey={CHART_DATA_KEYS.submissions} name={labels.submissions} fill="#8884d8" />
              <Bar dataKey={CHART_DATA_KEYS.awards} name={labels.awards} fill="#82ca9d" />
              <Bar dataKey={CHART_DATA_KEYS.rejections} name={labels.rejections} fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AdminCharts;
