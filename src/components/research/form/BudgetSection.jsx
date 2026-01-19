import React from 'react';

const BudgetSection = ({ 
  formData, 
  errors, 
  handleChange, 
  handleBudgetComponentChange,
  budgetComponents,
  currencyOptions
}) => {
  return (
    <div className="form-section">
      <h2>תקציב</h2>
      
      <div className="form-group">
        <label>רכיבי התקציב <span className="required">*</span></label>
        <p className="form-subtitle" style={{ marginBottom: '15px', color: '#6c757d', fontSize: '14px' }}>
          הזינו את הסכום המבוקש לכל קטגוריה. הסכום הכולל יחושב אוטומטית.
        </p>
        <div className="budget-components-grid">
          {budgetComponents.map(component => (
            <div key={component} className="budget-component-item">
              <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                {component}
              </label>
              <input
                type="number"
                placeholder="הזינו סכום"
                value={formData.budgetComponents[component] || ''}
                onChange={(e) => handleBudgetComponentChange(component, e.target.value)}
                min="0"
                step="0.01"
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
        {errors.budgetComponents && (
          <span className="error-message" style={{ display: 'block', marginTop: '10px' }}>
            {errors.budgetComponents}
          </span>
        )}
      </div>

      <div className="form-row" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e9ecef' }}>
        <div className="form-group">
          <label htmlFor="totalBudget">
            סה"כ התקציב המבוקש (חישוב אוטומטי)
          </label>
          <input
            type="text"
            id="totalBudget"
            name="totalBudget"
            value={formData.totalBudget ? Number(formData.totalBudget).toLocaleString('he-IL') : ''}
            readOnly
            className="readonly-field"
            placeholder="יחושב אוטומטית מכל הקטגוריות"
            style={{ fontWeight: '600', fontSize: '18px', color: '#667eea' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="currency">
            מטבע התקציב
          </label>
          <select
            id="currency"
            name="currency"
            value={formData.currency}
            onChange={handleChange}
          >
            {currencyOptions.map(currency => (
              <option key={currency.value} value={currency.value}>{currency.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="convertedBudget">
            התקציב המתורגם לשקלים (חישוב אוטומטי)
          </label>
          <input
            type="text"
            id="convertedBudget"
            name="convertedBudget"
            value={formData.convertedBudget ? Number(formData.convertedBudget).toLocaleString('he-IL') : ''}
            readOnly
            className="readonly-field"
            placeholder="יחושב אוטומטית"
          />
        </div>
      </div>
    </div>
  );
};

export default BudgetSection;
