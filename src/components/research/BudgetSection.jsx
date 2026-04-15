import React from 'react';

const formatCurrency = (amount, currency = 'ILS') => {
  if (!amount) return 'לא צוין';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
  return `${currencySymbol} ${Number(amount).toLocaleString('he-IL')}`;
};

const BudgetSection = ({ researchData }) => {
  if (!researchData) return null;

  return (
    <div style={{ 
      background: '#f9f9f9', 
      padding: '30px', 
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h2 style={{ marginBottom: '20px', color: '#667eea' }}>תקציב</h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            תקציב כולל:
          </label>
          <span style={{ fontSize: '16px' }}>
            {formatCurrency(researchData.totalBudget, researchData.currency)}
          </span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            מטבע:
          </label>
          <span style={{ fontSize: '16px' }}>{researchData.currency || 'ILS'}</span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            תקציב מומר:
          </label>
          <span style={{ fontSize: '16px' }}>
            {formatCurrency(researchData.convertedBudget, 'ILS')}
          </span>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontWeight: 'bold', 
            marginBottom: '5px',
            color: '#666'
          }}>
            תקציב שאושר:
          </label>
          <span style={{ fontSize: '16px' }}>
            {researchData.approvedBudget !== undefined && researchData.approvedBudget !== null
              ? formatCurrency(researchData.approvedBudget, 'ILS')
              : 'לא צוין'}
          </span>
        </div>
      </div>

      {researchData.budgetComponents && Object.keys(researchData.budgetComponents).length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#666' }}>רכיבי תקציב (מבוקש / התקבל):</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #ddd' }}>רכיב</th>
                  <th style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #ddd' }}>מבוקש</th>
                  <th style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #ddd' }}>התקבל</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(researchData.budgetComponents).map(([key, value]) => {
                  const approvedValue = researchData.approvedBudgetComponents?.[key];
                  return (
                    <tr key={key}>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#475569' }}>
                        {key}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        {formatCurrency(value, researchData.currency)}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        {approvedValue !== undefined && approvedValue !== null
                          ? formatCurrency(approvedValue, researchData.currency)
                          : 'לא צוין'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetSection;
