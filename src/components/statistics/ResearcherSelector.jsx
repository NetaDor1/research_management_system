import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const ResearcherSelector = ({ 
  uniqueResearchers, 
  searchTerm, 
  selectedResearcher, 
  onSearchChange, 
  onSelectChange 
}) => {
  const { t, isRTL } = useLanguage();
  const direction = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'right' : 'left';

  const filteredResearchers = uniqueResearchers.filter(researcher =>
    researcher.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ marginBottom: '20px', direction }}>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '15px' }}>
        <input
          type="text"
          placeholder={t('statsSearchResearcher', 'חפש חוקר...')}
          value={searchTerm}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (e.target.value && filteredResearchers.length === 1) {
              onSelectChange(filteredResearchers[0]);
            }
          }}
          style={{
            width: '150px',
            padding: '12px 6px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '15px',
            direction
          }}
        />
        
        <select 
          value={selectedResearcher} 
          onChange={(e) => {
            onSelectChange(e.target.value);
            if (e.target.value !== 'all') {
              onSearchChange(e.target.value);
            } else {
              onSearchChange('');
            }
          }}
          style={{ 
            width: '150px',
            padding: '12px 6px', 
            borderRadius: '4px', 
            border: '1px solid #ddd',
            fontSize: '15px',
            direction
          }}
        >
          <option value="all">{t('statsSelectResearcher', 'בחר חוקר...')}</option>
          {filteredResearchers.length > 0 ? (
            filteredResearchers.map(researcher => (
              <option key={researcher} value={researcher}>{researcher}</option>
            ))
          ) : (
            <option value="all" disabled>{t('statsNoResults', 'לא נמצאו תוצאות')}</option>
          )}
        </select>
      </div>
      
      {searchTerm && filteredResearchers.length === 0 && (
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px', textAlign }}>
          {t('statsNoResearchersMatch', 'לא נמצאו חוקרים התואמים לחיפוש')}
        </p>
      )}
    </div>
  );
};

export default ResearcherSelector;
