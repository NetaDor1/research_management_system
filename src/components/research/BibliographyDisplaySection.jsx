import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const hasRowContent = (row) =>
  Boolean(
    row?.institutionLocation?.trim() ||
      row?.degree?.trim() ||
      row?.monthYear?.trim() ||
      row?.fieldOfStudy?.trim()
  );

const hasBibliographyData = (researchData) => {
  if (!researchData) return false;
  const educationRows = (researchData.bibliographyEducationTraining || []).filter(hasRowContent);
  return Boolean(
    researchData.principalInvestigatorName?.trim() ||
      researchData.biographicalSummaryName?.trim() ||
      researchData.biographicalSummaryPositionTitle?.trim() ||
      educationRows.length > 0 ||
      researchData.bibliographyPersonalStatement?.trim() ||
      researchData.bibliographyPositionsAndHonors?.trim() ||
      researchData.bibliographySelectedPublications?.trim() ||
      researchData.bibliographyResearchSupport?.trim()
  );
};

const BibliographyDisplaySection = ({ researchData }) => {
  const { t, isRTL } = useLanguage();
  const textAlign = isRTL ? 'right' : 'left';

  if (!hasBibliographyData(researchData)) return null;

  const fieldStyle = {
    fontSize: '16px',
    lineHeight: '1.8',
    whiteSpace: 'pre-wrap',
    background: '#fff',
    padding: '15px',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
  };

  const headingStyle = {
    marginBottom: '10px',
    color: '#495057',
    fontSize: '18px',
    fontWeight: 'bold',
  };

  const educationRows = (researchData.bibliographyEducationTraining || []).filter(hasRowContent);

  const textFields = [
    { key: 'bibliographyPersonalStatement', label: t('personalStatementLabel', 'A. Personal Statement'), value: researchData.bibliographyPersonalStatement },
    { key: 'bibliographyPositionsAndHonors', label: t('positionsAndHonorsLabel', 'B. Positions and Honors'), value: researchData.bibliographyPositionsAndHonors },
    { key: 'bibliographySelectedPublications', label: t('selectedPublicationsLabel', 'C. Selected Peer-reviewed Publications'), value: researchData.bibliographySelectedPublications },
    { key: 'bibliographyResearchSupport', label: t('researchSupportLabel', 'D. Research Support'), value: researchData.bibliographyResearchSupport },
  ];

  return (
    <div style={{ background: '#f9f9f9', padding: '30px', borderRadius: '8px', marginBottom: '20px', textAlign }}>
      <h2 style={{ marginBottom: '20px', color: '#667eea' }}>{t('bibliographyTitle', 'ביבליוגרפיה')}</h2>

      {researchData.principalInvestigatorName?.trim() && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={headingStyle}>{t('principalInvestigatorLabel', 'Principal Investigator')}</h3>
          <p style={fieldStyle}>{researchData.principalInvestigatorName}</p>
        </div>
      )}

      {(researchData.biographicalSummaryName?.trim() || researchData.biographicalSummaryPositionTitle?.trim()) && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ ...headingStyle, fontSize: '16px', color: '#667eea' }}>{t('biographicalSummaryTitle', 'BIOGRAPHICAL SUMMARY')}</h3>
          {researchData.biographicalSummaryName?.trim() && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ ...headingStyle, fontSize: '15px' }}>{t('biographicalNameLabel', 'שם')}</h4>
              <p style={fieldStyle}>{researchData.biographicalSummaryName}</p>
            </div>
          )}
          {researchData.biographicalSummaryPositionTitle?.trim() && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ ...headingStyle, fontSize: '15px' }}>{t('positionTitleLabel', 'POSITION TITLE')}</h4>
              <p style={fieldStyle}>{researchData.biographicalSummaryPositionTitle}</p>
            </div>
          )}
        </div>
      )}

      {educationRows.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ ...headingStyle, fontSize: '16px', color: '#667eea' }}>{t('educationTrainingTitle', 'EDUCATION/TRAINING')}</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {educationRows.map((row, index) => (
              <div key={`edu-${index}`} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '6px', padding: '12px 15px' }}>
                {row.institutionLocation?.trim() && <div style={{ marginBottom: '6px' }}><strong>{t('institutionLocationLabel', 'INSTITUTION AND LOCATION')}: </strong>{row.institutionLocation}</div>}
                {row.degree?.trim() && <div style={{ marginBottom: '6px' }}><strong>{t('degreeLabel', 'DEGREE')}: </strong>{row.degree}</div>}
                {row.monthYear?.trim() && <div style={{ marginBottom: '6px' }}><strong>{t('monthYearLabel', 'MM/YY')}: </strong>{row.monthYear}</div>}
                {row.fieldOfStudy?.trim() && <div><strong>{t('fieldOfStudyLabel', 'FIELD OF STUDY')}: </strong>{row.fieldOfStudy}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {textFields.map(({ key, label, value }) =>
        value?.trim() ? (
          <div key={key} style={{ marginBottom: '25px' }}>
            <h3 style={headingStyle}>{label}</h3>
            <p style={fieldStyle}>{value}</p>
          </div>
        ) : null
      )}
    </div>
  );
};

export default BibliographyDisplaySection;
