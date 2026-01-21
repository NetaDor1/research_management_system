import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ResearcherSelector from './ResearcherSelector';

const AdminCharts = ({ 
  adminStats, 
  uniqueResearchers,
  selectedResearcherForChart,
  researcherSearchTerm,
  onResearcherSearchChange,
  onResearcherSelectChange
}) => {
  return (
    <div className="statistics-section" style={{ marginTop: '40px' }}>
      <h2>גרפים</h2>
      
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
      {adminStats.byResearcher.length > 0 && (
        <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, textAlign: 'right' }}>הגשות וזכיות לפי חוקר</h3>
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
      )}

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
  );
};

export default AdminCharts;
