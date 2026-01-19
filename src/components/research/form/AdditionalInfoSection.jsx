import React from 'react';

const AdditionalInfoSection = ({ 
  formData, 
  handleChange, 
  handleDatePickerChange,
  formatDateForDisplay,
  convertDateToISO,
  expectedDatePickerRef
}) => {
  return (
    <div className="form-section">
      <h2>מידע נוסף</h2>
      
      <div className="form-group">
        <label htmlFor="expectedResponseDate">
          תאריך משוער לקבלת תשובות קבלה / דחיה מהקרנות החיצוניות
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
          <input
            type="text"
            id="expectedResponseDate"
            name="expectedResponseDate"
            value={formatDateForDisplay(formData.expectedResponseDate)}
            onChange={handleChange}
            placeholder="dd/mm/yyyy"
            maxLength="10"
            style={{ flex: 1 }}
          />
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <input
              type="date"
              ref={expectedDatePickerRef}
              value={convertDateToISO(formData.expectedResponseDate) || ''}
              onChange={(e) => handleDatePickerChange('expectedResponseDate', e.target.value)}
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                zIndex: 2
              }}
              title="בחר תאריך מלוח שנה"
            />
            <div
              style={{
                cursor: 'pointer',
                fontSize: '20px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8f9fa',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                minWidth: '40px',
                height: '40px',
                transition: 'all 0.2s',
                margin: 0,
                pointerEvents: 'none'
              }}
              onMouseEnter={(e) => {
                const parent = e.target.parentElement;
                if (parent) {
                  parent.style.background = '#e9ecef';
                  parent.style.borderColor = '#667eea';
                }
              }}
              onMouseLeave={(e) => {
                const parent = e.target.parentElement;
                if (parent) {
                  parent.style.background = '#f8f9fa';
                  parent.style.borderColor = '#e9ecef';
                }
              }}
            >
              📅
            </div>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="notes">
          הערות (כתיבה חופשית)
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="הערות נוספות"
          rows="6"
        />
      </div>
    </div>
  );
};

export default AdditionalInfoSection;
