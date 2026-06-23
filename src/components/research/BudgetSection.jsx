import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getBudgetComponentLabel } from '../../utils/budgetComponents';

const BudgetSection = ({ researchData }) => {
  const { t, language, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';
  const locale = language === 'en' ? 'en-US' : 'he-IL';
  const notSpecified = t('notSpecified', 'לא צוין');

  const formatCurrency = (amount, currency = 'ILS') => {
    if (!amount && amount !== 0) return notSpecified;
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
    return `${currencySymbol} ${Number(amount).toLocaleString(locale, { style: 'decimal' })}`;
  };

  const currency = researchData?.currency || 'ILS';
  const rateToILS = currency === 'USD' ? 3.5 : currency === 'EUR' ? 3.8 : 1;
  const showILS = currency !== 'ILS';

  const toILS = (amount) => {
    if (!amount && amount !== 0) return null;
    const converted = Number(amount) * rateToILS;
    return `₪ ${converted.toLocaleString(locale, { style: 'decimal' })}`;
  };

  if (!researchData) return null;

  return (
    <div style={{ 
      background: '#f9f9f9', 
      padding: '30px', 
      borderRadius: '8px',
      marginBottom: '20px',
      textAlign,
    }}>
      <h2 style={{ marginBottom: '20px', color: '#667eea' }}>
        {t('budgetTitle', 'תקציב')}
      </h2>
      
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
            {t('totalBudget', 'תקציב כולל')}:
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
            {t('currency', 'מטבע')}:
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
            {t('convertedBudget', 'תקציב מומר')}:
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
            {t('approvedBudget', 'תקציב שאושר')}:
          </label>
          {researchData.approvedBudget !== undefined && researchData.approvedBudget !== null ? (
            <>
              <span style={{ fontSize: '16px' }}>
                {formatCurrency(researchData.approvedBudget, 'ILS')}
              </span>
              {showILS && (
                <span style={{ fontSize: '13px', color: '#2b6cb0', display: 'block', marginTop: '2px' }}>
                  {`≈ ${formatCurrency(researchData.approvedBudget / rateToILS, currency)}`}
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: '16px' }}>{notSpecified}</span>
          )}
        </div>
      </div>

      {researchData.budgetComponents && Object.keys(researchData.budgetComponents).length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#666' }}>
            {t('budgetComponentsRequestedReceived', 'רכיבי תקציב (מבוקש / התקבל)')}:
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr>
                  <th style={{ textAlign, padding: '10px', borderBottom: '1px solid #ddd' }}>
                    {t('component', 'רכיב')}
                  </th>
                  <th style={{ textAlign, padding: '10px', borderBottom: '1px solid #ddd' }}>
                    {t('requested', 'מבוקש')}
                  </th>
                  {showILS && (
                    <th style={{ textAlign, padding: '10px', borderBottom: '1px solid #ddd', color: '#2b6cb0', fontSize: '13px' }}>
                      {t('convertedILS', 'המרה לשקלים')}
                    </th>
                  )}
                  <th style={{ textAlign, padding: '10px', borderBottom: '1px solid #ddd' }}>
                    {t('received', 'התקבל')}
                  </th>
                  {showILS && (
                    <th style={{ textAlign, padding: '10px', borderBottom: '1px solid #ddd', color: '#2b6cb0', fontSize: '13px' }}>
                      {t('convertedILS', 'המרה לשקלים')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {Object.entries(researchData.budgetComponents).map(([key, value]) => {
                  const approvedValue = researchData.approvedBudgetComponents?.[key];
                  const hasApproved = approvedValue !== undefined && approvedValue !== null;
                  return (
                    <tr key={key}>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#475569' }}>
                        {getBudgetComponentLabel(key, t)}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        {formatCurrency(value, currency)}
                      </td>
                      {showILS && (
                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#2b6cb0', fontSize: '14px' }}>
                          {value ? toILS(value) : '—'}
                        </td>
                      )}
                      <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        {hasApproved ? formatCurrency(approvedValue, currency) : notSpecified}
                      </td>
                      {showILS && (
                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#2b6cb0', fontSize: '14px' }}>
                          {hasApproved ? toILS(approvedValue) : '—'}
                        </td>
                      )}
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
