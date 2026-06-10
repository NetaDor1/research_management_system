import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../../context/LanguageContext';

const CHART_KEYS = {
  submissions: 'submissions',
  awards: 'awards',
  rejections: 'rejections',
  pending: 'pending',
  israeli: 'israeli',
  international: 'international',
};

const ResearcherCharts = ({ researcherStats }) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const chartHeadingStyle = { marginBottom: '20px', textAlign };

  const labels = {
    submissions: t('statsSubmissions', 'הגשות'),
    awards: t('statsAwards', 'זכיות'),
    rejections: t('statsRejections', 'דחיות'),
    pending: t('statsPending', 'בהמתנה'),
    israeli: t('statsIsraeliFunds', 'קרנות בארץ'),
    international: t('statsInternationalFunds', 'קרנות בחו"ל'),
  };

  return (
    <div className="statistics-section" style={{ marginTop: '40px' }}>
      <h2>{t('statsCharts', 'גרפים')}</h2>
    
      <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={chartHeadingStyle}>{t('statsSubmissionsAwardsRejections', 'הגשות, זכיות ודחיות')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          {(() => {
            const maxValue = Math.max(researcherStats.totalSubmissions, researcherStats.totalAwards, researcherStats.totalRejections, 1);
            const ticks = Array.from({ length: Math.min(maxValue + 2, 20) }, (_, i) => i);
            
            return (
              <BarChart data={[
                { name: labels.submissions, key: CHART_KEYS.submissions, value: researcherStats.totalSubmissions },
                { name: labels.awards, key: CHART_KEYS.awards, value: researcherStats.totalAwards },
                { name: labels.rejections, key: CHART_KEYS.rejections, value: researcherStats.totalRejections }
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

      {(researcherStats.totalSubmissions > 0) && (
        <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={chartHeadingStyle}>{t('statsStatusDistribution', 'חלוקה לפי סטטוס')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: labels.awards, value: researcherStats.totalAwards },
                  { name: labels.rejections, value: researcherStats.totalRejections },
                  { name: labels.pending, value: researcherStats.totalSubmissions - researcherStats.totalAwards - researcherStats.totalRejections }
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

      {researcherStats.byYear && researcherStats.byYear.length > 0 && (
        <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={chartHeadingStyle}>{t('statsByYearChart', 'הגשות וזכיות לפי שנים')}</h3>
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
              <Line type="monotone" dataKey="totalSubmissions" stroke="#8884d8" name={labels.submissions} strokeWidth={2} />
              <Line type="monotone" dataKey="totalAwards" stroke="#82ca9d" name={labels.awards} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(researcherStats.israeliFunds > 0 || researcherStats.internationalFunds > 0) && (
        <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={chartHeadingStyle}>{t('statsFundsDistribution', 'חלוקת קרנות')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: labels.israeli, value: researcherStats.israeliFunds },
                  { name: labels.international, value: researcherStats.internationalFunds }
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
