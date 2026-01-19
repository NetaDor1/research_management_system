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
      </div>

      {researchData.budgetComponents && Object.keys(researchData.budgetComponents).length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#666' }}>רכיבי תקציב:</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '15px'
          }}>
            {Object.entries(researchData.budgetComponents).map(([key, value]) => (
              <div key={key} style={{
                padding: '15px',
                background: '#fff',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}>
                <span style={{ fontWeight: 'bold', color: '#666' }}>{key}:</span>
                <span style={{ marginRight: '10px' }}>
                  {formatCurrency(value, researchData.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetSection;
