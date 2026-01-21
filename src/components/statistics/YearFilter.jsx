import React from 'react';

const YearFilter = ({ 
  yearFilterType, 
  yearRange, 
  onFilterTypeChange, 
  onYearRangeChange 
}) => {
  return (
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
            onFilterTypeChange('all');
            onYearRangeChange({ start: '', end: '' });
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
          value={yearRange.start}
          onChange={(e) => {
            onYearRangeChange({ ...yearRange, start: e.target.value });
            if (e.target.value && yearRange.end) {
              onFilterTypeChange('range');
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
          value={yearRange.end}
          onChange={(e) => {
            onYearRangeChange({ ...yearRange, end: e.target.value });
            if (yearRange.start && e.target.value) {
              onFilterTypeChange('range');
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
  );
};

export default YearFilter;
