import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ResearcherCharts = ({ researcherStats }) => {
  return (
    <div className="statistics-section" style={{ marginTop: '40px' }}>
      <h2>גרפים</h2>
    
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
  );
};

export default ResearcherCharts;
