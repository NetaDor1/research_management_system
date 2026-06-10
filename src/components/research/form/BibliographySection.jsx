import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import AIPolishButton from '../AIPolishButton';

const BIBLIO_LABELS_HE = {
  bibliographyPersonalStatement: 'הצהרה אישית',
  bibliographyPositionsAndHonors: 'תפקידים והוקרות',
  bibliographySelectedPublications: 'פרסומים נבחרים',
  bibliographyResearchSupport: 'תמיכת מחקר',
};

const BIBLIO_LABELS_EN = {
  bibliographyPersonalStatement: 'Personal Statement',
  bibliographyPositionsAndHonors: 'Positions and Honors',
  bibliographySelectedPublications: 'Selected Publications',
  bibliographyResearchSupport: 'Research Support',
};

const BibliographySection = ({
  formData,
  handleChange,
  handleBibliographyEducationChange,
  addBibliographyEducationRow,
  removeBibliographyEducationRow,
  onPolish,
}) => {
  const { t, language } = useLanguage();
  const lang = language === 'en' ? 'en' : 'he';
  const fieldLabels = lang === 'en' ? BIBLIO_LABELS_EN : BIBLIO_LABELS_HE;

  const educationRows = formData?.bibliographyEducationTraining || [];

  const polishFields = {
    bibliographyPersonalStatement: formData.bibliographyPersonalStatement,
    bibliographyPositionsAndHonors: formData.bibliographyPositionsAndHonors,
    bibliographySelectedPublications: formData.bibliographySelectedPublications,
    bibliographyResearchSupport: formData.bibliographyResearchSupport,
  };

  return (
    <div className="form-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>{t('bibliographyTitle', 'ביבליוגרפיה')}</h2>
        {onPolish && (
          <AIPolishButton
            fields={polishFields}
            fieldLabels={fieldLabels}
            onApply={onPolish}
            lang={lang}
          />
        )}
      </div>

      <div className="form-group">
        <label htmlFor="principalInvestigatorName">
          {t('principalInvestigatorLabel', 'Principal Investigator (Last, First, Middle)')}
        </label>
        <input
          type="text"
          id="principalInvestigatorName"
          name="principalInvestigatorName"
          value={formData.principalInvestigatorName || ''}
          onChange={handleChange}
          placeholder={t('principalInvestigatorPlaceholder', 'למשל: כהן, דנה, מרים')}
        />
      </div>

      <h3 style={{ marginBottom: '12px' }}>{t('biographicalSummaryTitle', 'BIOGRAPHICAL SUMMARY')}</h3>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="biographicalSummaryName">{t('biographicalNameLabel', 'שם')}</label>
          <input
            type="text"
            id="biographicalSummaryName"
            name="biographicalSummaryName"
            value={formData.biographicalSummaryName || ''}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="biographicalSummaryPositionTitle">{t('positionTitleLabel', 'POSITION TITLE')}</label>
          <input
            type="text"
            id="biographicalSummaryPositionTitle"
            name="biographicalSummaryPositionTitle"
            value={formData.biographicalSummaryPositionTitle || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>{t('educationTrainingTitle', 'EDUCATION/TRAINING')}</label>
        <p style={{ marginTop: 0, color: '#64748b', fontSize: '13px' }}>
          {t(
            'educationTrainingHelp',
            'Begin with baccalaureate or other initial professional education, include postdoctoral/residency training if applicable.'
          )}
        </p>
        <div style={{ display: 'grid', gap: '10px' }}>
          {educationRows.map((row, index) => (
            <div
              key={`education-row-${index}`}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                background: '#fafafa',
              }}
            >
              <div className="form-row">
                <div className="form-group">
                  <label>{t('institutionLocationLabel', 'INSTITUTION AND LOCATION')}</label>
                  <input
                    type="text"
                    value={row.institutionLocation || ''}
                    onChange={(e) => handleBibliographyEducationChange(index, 'institutionLocation', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t('degreeLabel', 'DEGREE (if applicable)')}</label>
                  <input
                    type="text"
                    value={row.degree || ''}
                    onChange={(e) => handleBibliographyEducationChange(index, 'degree', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('monthYearLabel', 'MM/YY')}</label>
                  <input
                    type="text"
                    value={row.monthYear || ''}
                    onChange={(e) => handleBibliographyEducationChange(index, 'monthYear', e.target.value)}
                    placeholder="MM/YY"
                  />
                </div>
                <div className="form-group">
                  <label>{t('fieldOfStudyLabel', 'FIELD OF STUDY')}</label>
                  <input
                    type="text"
                    value={row.fieldOfStudy || ''}
                    onChange={(e) => handleBibliographyEducationChange(index, 'fieldOfStudy', e.target.value)}
                  />
                </div>
              </div>

              {educationRows.length > 1 && (
                <button type="button" className="remove-btn" onClick={() => removeBibliographyEducationRow(index)}>
                  {t('remove', 'הסר')}
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="button" className="add-btn" onClick={addBibliographyEducationRow}>
          + {t('addEducationRow', 'הוסף שורת השכלה')}
        </button>
      </div>

      <div className="form-group">
        <label htmlFor="bibliographyPersonalStatement">
          {t('personalStatementLabel', 'A. Personal Statement')}
        </label>
        <textarea
          id="bibliographyPersonalStatement"
          name="bibliographyPersonalStatement"
          value={formData.bibliographyPersonalStatement || ''}
          onChange={handleChange}
          rows="5"
          placeholder={t('personalStatementPlaceholder', 'Briefly describe your experience and qualifications...')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="bibliographyPositionsAndHonors">
          {t('positionsAndHonorsLabel', 'B. Positions and Honors')}
        </label>
        <textarea
          id="bibliographyPositionsAndHonors"
          name="bibliographyPositionsAndHonors"
          value={formData.bibliographyPositionsAndHonors || ''}
          onChange={handleChange}
          rows="5"
          placeholder={t('positionsAndHonorsPlaceholder', 'List previous positions and honors chronologically.')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="bibliographySelectedPublications">
          {t('selectedPublicationsLabel', 'C. Selected Peer-reviewed Publications')}
        </label>
        <textarea
          id="bibliographySelectedPublications"
          name="bibliographySelectedPublications"
          value={formData.bibliographySelectedPublications || ''}
          onChange={handleChange}
          rows="6"
          placeholder={t('selectedPublicationsPlaceholder', 'List selected publications and mark the 5 most relevant.')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="bibliographyResearchSupport">
          {t('researchSupportLabel', 'D. Research Support')}
        </label>
        <textarea
          id="bibliographyResearchSupport"
          name="bibliographyResearchSupport"
          value={formData.bibliographyResearchSupport || ''}
          onChange={handleChange}
          rows="6"
          placeholder={t('researchSupportPlaceholder', 'List ongoing/completed projects from the past 3 years.')}
        />
      </div>
    </div>
  );
};

export default BibliographySection;

