import React from 'react';

const sectionStyle = {
  background: '#f9f9f9',
  padding: '30px',
  borderRadius: '8px',
  marginBottom: '20px',
};

const headingStyle = { marginBottom: '20px', color: '#667eea' };

const labelStyle = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: '5px',
  color: '#666',
};

const Field = ({ label, value, notSpecified }) => (
  <div>
    <label style={labelStyle}>{label}:</label>
    <span style={{ fontSize: '16px', whiteSpace: 'pre-wrap' }}>{value || notSpecified}</span>
  </div>
);

const TextBlock = ({ label, value, notSpecified }) => {
  if (!value) return null;
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}:</label>
      <p style={{ margin: '4px 0 0', fontSize: '16px', whiteSpace: 'pre-wrap' }}>{value}</p>
    </div>
  );
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
};

const yesNoLabel = (value, t) => {
  if (value === 'yes') return t('yes', 'כן');
  if (value === 'no') return t('no', 'לא');
  return null;
};

const hasDisclosureData = (data) => {
  if (!data) return false;
  const keys = [
    'inventionTitleEnglish', 'inventionTitleHebrew', 'shortDescription',
    'inventionTypeElaboration', 'potentialCustomers', 'commercialEntityContacts',
    'inventionTimeFrame', 'inventionWorkType', 'fundingSupportType',
    'nonJceMaterialsDetails', 'publicationDetails', 'futurePublicationPlans',
    'priorPatentDetails', 'literatureSurveyNotes', 'scientificBackground',
    'detailedDescription', 'advantagesOverExisting', 'potentialUsesAndImplementation',
    'additionalResearchProgram', 'referenceList', 'developmentBudgetEstimate',
    'developmentTimeEstimate',
  ];
  if (keys.some((k) => data[k])) return true;
  if (data.inventionFirstDate) return true;
  if (data.nonJceMaterialsUsed || data.hasBeenPublished || data.priorPatentFiled || data.literatureSurveyPerformed) return true;
  if (Array.isArray(data.inventors) && data.inventors.length > 0) return true;
  if (Array.isArray(data.fundingSources) && data.fundingSources.length > 0) return true;
  if (Array.isArray(data.priorArtPatents) && data.priorArtPatents.length > 0) return true;
  if (Array.isArray(data.priorArtPublications) && data.priorArtPublications.length > 0) return true;
  return false;
};

const PatentDisclosureDisplay = ({ patentData, t, formatDate, notSpecified }) => {
  if (!hasDisclosureData(patentData)) return null;

  const fundingTypeLabels = {
    not_supported: t('fundingNotSupported', 'ללא תמיכה'),
    grant: t('fundingGrant', 'מענק'),
    grant_company: t('fundingGrantCompany', 'מענק ו/או הסכם עם חברה'),
    other: t('fundingOther', 'מקורות אחרים'),
  };

  return (
    <>
      <div style={sectionStyle}>
        <h2 style={headingStyle}>{t('doiFormTitle', 'טופס גילוי המצאה (DOI)')}</h2>
        <div style={gridStyle}>
          <Field label={t('inventionTitleEnglish', 'שם המצאה (אנגלית)')} value={patentData.inventionTitleEnglish} notSpecified={notSpecified} />
          <Field label={t('inventionTitleHebrew', 'שם המצאה (עברית)')} value={patentData.inventionTitleHebrew} notSpecified={notSpecified} />
        </div>
        <TextBlock label={t('shortDescriptionInvention', 'תיאור קצר')} value={patentData.shortDescription} notSpecified={notSpecified} />
        <TextBlock label={t('inventionTypeElaboration', 'מוצר/תהליך/שיטה')} value={patentData.inventionTypeElaboration} notSpecified={notSpecified} />
        <TextBlock label={t('potentialCustomers', 'לקוחות פוטנציאליים')} value={patentData.potentialCustomers} notSpecified={notSpecified} />
        <TextBlock label={t('commercialEntityContacts', 'קשרים מסחריים')} value={patentData.commercialEntityContacts} notSpecified={notSpecified} />
      </div>

      {Array.isArray(patentData.inventors) && patentData.inventors.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={headingStyle}>{t('inventorsContributors', 'ממציאים (תורמים)')}</h2>
          {patentData.inventors.map((inv, index) => (
            <div key={`inv-display-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '12px', background: '#fff' }}>
              <h3 style={{ marginTop: 0 }}>{t('inventor', 'ממציא')} {index + 1}</h3>
              <div style={gridStyle}>
                <Field label={t('titleAndName', 'תואר')} value={inv.title} notSpecified={notSpecified} />
                <Field label={t('fullName', 'שם מלא')} value={inv.name} notSpecified={notSpecified} />
                <Field label={t('nationalId', 'ת.ז.')} value={inv.nationalId} notSpecified={notSpecified} />
                <Field label={t('inventorEmail', 'אימייל')} value={inv.email} notSpecified={notSpecified} />
                <Field label={t('department', 'מחלקה')} value={inv.department} notSpecified={notSpecified} />
                <Field label={t('inventorInstitution', 'מוסד')} value={inv.institution} notSpecified={notSpecified} />
                <Field label={t('partInInvention', 'חלק בהמצאה (%)')} value={inv.partInInvention} notSpecified={notSpecified} />
                <Field
                  label={t('inventorOrContributor', 'סוג')}
                  value={inv.roleType === 'contributor' ? t('contributor', 'תורם') : t('inventor', 'ממציא')}
                  notSpecified={notSpecified}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={sectionStyle}>
        <h2 style={headingStyle}>{t('inventionDates', 'תאריכי המצאה')}</h2>
        <div style={gridStyle}>
          <Field label={t('inventionFirstDate', 'תאריך ראשון')} value={formatDate(patentData.inventionFirstDate)} notSpecified={notSpecified} />
          <Field label={t('inventionTimeFrame', 'מסגרת זמן')} value={patentData.inventionTimeFrame} notSpecified={notSpecified} />
        </div>
        <TextBlock label={t('inventionWorkType', 'סוג העבודה')} value={patentData.inventionWorkType} notSpecified={notSpecified} />
      </div>

      {patentData.fundingSupportType && (
        <div style={sectionStyle}>
          <h2 style={headingStyle}>{t('fundingSupportMaterials', 'מימון ותמיכה')}</h2>
          <Field label={t('fundingSupportType', 'סוג התמיכה')} value={fundingTypeLabels[patentData.fundingSupportType] || patentData.fundingSupportType} notSpecified={notSpecified} />
          {Array.isArray(patentData.fundingSources) && patentData.fundingSources.map((row, index) => (
            <div key={`fund-display-${index}`} style={{ marginTop: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
              <div style={gridStyle}>
                <Field label={t('sourceOfSupport', 'מקור')} value={row.source} notSpecified={notSpecified} />
                <Field label={t('supportPeriod', 'תקופה')} value={row.supportPeriod} notSpecified={notSpecified} />
                <Field label={t('grantNumber', 'מספר מענק')} value={row.grantNumber} notSpecified={notSpecified} />
                <Field label={t('subjectComments', 'הערות')} value={row.subjectComments} notSpecified={notSpecified} />
              </div>
            </div>
          ))}
        </div>
      )}

      {(patentData.nonJceMaterialsUsed || patentData.hasBeenPublished || patentData.priorPatentFiled) && (
        <div style={sectionStyle}>
          <h2 style={headingStyle}>{t('publicationAndMaterials', 'פרסום, חומרים ובקשות קודמות')}</h2>
          {patentData.nonJceMaterialsUsed && (
            <>
              <Field label={t('nonJceMaterialsUsed', 'חומרים שאינם מ-JCE')} value={yesNoLabel(patentData.nonJceMaterialsUsed, t)} notSpecified={notSpecified} />
              <TextBlock label={t('nonJceMaterialsDetails', 'פרטים')} value={patentData.nonJceMaterialsDetails} notSpecified={notSpecified} />
            </>
          )}
          {patentData.hasBeenPublished && (
            <>
              <Field label={t('hasBeenPublished', 'פורסם')} value={yesNoLabel(patentData.hasBeenPublished, t)} notSpecified={notSpecified} />
              <TextBlock label={t('publicationDetails', 'פרטי פרסום')} value={patentData.publicationDetails} notSpecified={notSpecified} />
              <TextBlock label={t('futurePublicationPlans', 'תוכניות עתידיות')} value={patentData.futurePublicationPlans} notSpecified={notSpecified} />
            </>
          )}
          {patentData.priorPatentFiled && (
            <>
              <Field label={t('priorPatentFiled', 'בקשת פטנט קודמת')} value={yesNoLabel(patentData.priorPatentFiled, t)} notSpecified={notSpecified} />
              <TextBlock label={t('priorPatentDetails', 'פרטים')} value={patentData.priorPatentDetails} notSpecified={notSpecified} />
            </>
          )}
        </div>
      )}

      {(patentData.literatureSurveyPerformed || (patentData.priorArtPatents?.length > 0) || (patentData.priorArtPublications?.length > 0)) && (
        <div style={sectionStyle}>
          <h2 style={headingStyle}>{t('priorArtLiterature', 'סקירת ספרות ו-Prior Art')}</h2>
          {patentData.literatureSurveyPerformed && (
            <>
              <Field label={t('literatureSurveyPerformed', 'סקירת ספרות')} value={yesNoLabel(patentData.literatureSurveyPerformed, t)} notSpecified={notSpecified} />
              <TextBlock label={t('literatureSurveyNotes', 'הערות')} value={patentData.literatureSurveyNotes} notSpecified={notSpecified} />
            </>
          )}
          {patentData.priorArtPatents?.map((row, index) => (
            <div key={`pap-${index}`} style={{ marginBottom: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
              <strong>{t('priorArtPatents', 'פטנט')} {index + 1}</strong>
              <div style={gridStyle}>
                <Field label={t('country', 'מדינה')} value={row.country} notSpecified={notSpecified} />
                <Field label={t('patentPublicationNumber', 'מספר')} value={row.publicationNumber} notSpecified={notSpecified} />
                <Field label={t('title', 'כותרת')} value={row.title} notSpecified={notSpecified} />
                <Field label={t('filingPublicationDate', 'תאריך')} value={row.filingPublicationDate} notSpecified={notSpecified} />
                <Field label={t('relevance', 'רלוונטיות')} value={row.relevance} notSpecified={notSpecified} />
              </div>
            </div>
          ))}
          {patentData.priorArtPublications?.map((row, index) => (
            <div key={`pub-${index}`} style={{ marginBottom: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
              <strong>{t('priorArtPublications', 'פרסום')} {index + 1}</strong>
              <div style={gridStyle}>
                <Field label={t('title', 'כותרת')} value={row.title} notSpecified={notSpecified} />
                <Field label={t('authors', 'מחברים')} value={row.authors} notSpecified={notSpecified} />
                <Field label={t('placeOfPublication', 'מקום פרסום')} value={row.placeOfPublication} notSpecified={notSpecified} />
                <Field label={t('publicationDate', 'תאריך פרסום')} value={row.publicationDate} notSpecified={notSpecified} />
                <Field label={t('publishedByInventor', 'פורסם ע"י ממציא')} value={yesNoLabel(row.publishedByInventor, t)} notSpecified={notSpecified} />
              </div>
            </div>
          ))}
        </div>
      )}

      {(patentData.scientificBackground || patentData.detailedDescription || patentData.advantagesOverExisting) && (
        <div style={sectionStyle}>
          <h2 style={headingStyle}>{t('detailedInventionDescription', 'תיאור מפורט')}</h2>
          <TextBlock label={t('scientificBackground', 'רקע מדעי')} value={patentData.scientificBackground} notSpecified={notSpecified} />
          <TextBlock label={t('detailedDescription', 'תיאור מפורט')} value={patentData.detailedDescription} notSpecified={notSpecified} />
          <TextBlock label={t('advantagesOverExisting', 'יתרונות')} value={patentData.advantagesOverExisting} notSpecified={notSpecified} />
          <TextBlock label={t('potentialUsesAndImplementation', 'שימושים ויישום')} value={patentData.potentialUsesAndImplementation} notSpecified={notSpecified} />
          <TextBlock label={t('additionalResearchProgram', 'תוכנית מחקר נוספת')} value={patentData.additionalResearchProgram} notSpecified={notSpecified} />
          <TextBlock label={t('referenceList', 'רשימת מקורות')} value={patentData.referenceList} notSpecified={notSpecified} />
          <div style={gridStyle}>
            <Field label={t('developmentBudgetEstimate', 'תקציב פיתוח משוער')} value={patentData.developmentBudgetEstimate} notSpecified={notSpecified} />
            <Field label={t('developmentTimeEstimate', 'זמן פיתוח משוער')} value={patentData.developmentTimeEstimate} notSpecified={notSpecified} />
          </div>
        </div>
      )}
    </>
  );
};

export default PatentDisclosureDisplay;
