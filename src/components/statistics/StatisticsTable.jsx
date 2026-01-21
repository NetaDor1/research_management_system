import React from 'react';

const StatisticsTable = ({ 
  title, 
  data, 
  columns 
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="statistics-section">
      <h2>{title}</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                {columns.map((col, colIdx) => (
                  <td 
                    key={colIdx} 
                    style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StatisticsTable;
