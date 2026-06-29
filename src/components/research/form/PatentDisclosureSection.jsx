import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import AIPolishButton from '../AIPolishButton';
import { textInputAlign, textInputDir } from '../../../utils/textInputDirection';
import '../AIPolishButton.css';

const DirTextarea = ({ value, style, ...props }) => {
  const dir = textInputDir(value);
  return (
    <textarea
      {...props}
      value={value}
      dir={dir}
      style={{ textAlign: textInputAlign(dir), ...style }}
    />
  );
};

const EMPTY_INVENTOR = {
  title: '',
  name: '',
  nationalId: '',
  email: '',
  department: '',
  institution: '',
  partInInvention: '',
  roleType: 'inventor',
};
const EMPTY_FUNDING = { source: '', supportPeriod: '', grantNumber: '', subjectComments: '' };
const EMPTY_PRIOR_PATENT = { country: '', publicationNumber: '', title: '', filingPublicationDate: '', relevance: '' };
const EMPTY_PRIOR_PUBLICATION = { title: '', authors: '', placeOfPublication: '', publicationDate: '', publishedByInventor: '' };

export { EMPTY_INVENTOR, EMPTY_FUNDING, EMPTY_PRIOR_PATENT, EMPTY_PRIOR_PUBLICATION };

const YesNoRadio = ({ name, value, onChange, t }) => (
  <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input type="radio" name={name} checked={value === 'yes'} onChange={() => onChange('yes')} />
      {t('yes', 'כן')}
    </label>
    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input type="radio" name={name} checked={value === 'no'} onChange={() => onChange('no')} />
      {t('no', 'לא')}
    </label>
  </div>
);

const PatentDisclosureSection = ({
  formData,
  handleChange,
  hasInventors,
  setHasInventors,
  onHasInventorsYes,
  handleInventorChange,
  addInventor,
  removeInventor,
  handleFundingSourceChange,
  addFundingSource,
  removeFundingSource,
  handlePriorArtPatentChange,
  addPriorArtPatent,
  removePriorArtPatent,
  handlePriorArtPublicationChange,
  addPriorArtPublication,
  removePriorArtPublication,
  handleInventionDateChange,
  handleInventionDatePickerChange,
  convertDateToISO,
  inventionDatePickerRef,
  onPolish,
}) => {
  const { t, language } = useLanguage();
  const lang = language === 'en' ? 'en' : 'he';

  const polishFields = {
    shortDescription: formData.shortDescription,
    inventionTypeElaboration: formData.inventionTypeElaboration,
    potentialCustomers: formData.potentialCustomers,
    commercialEntityContacts: formData.commercialEntityContacts,
  };

  const polishLabels = {
    shortDescription: t('shortDescriptionInvention'),
    inventionTypeElaboration: t('inventionTypeElaboration'),
    potentialCustomers: t('potentialCustomers'),
    commercialEntityContacts: t('commercialEntityContacts'),
  };

  const detailedPolishFields = {
    scientificBackground: formData.scientificBackground,
    detailedDescription: formData.detailedDescription,
    advantagesOverExisting: formData.advantagesOverExisting,
    potentialUsesAndImplementation: formData.potentialUsesAndImplementation,
    additionalResearchProgram: formData.additionalResearchProgram,
    referenceList: formData.referenceList,
  };

  const detailedPolishLabels = {
    scientificBackground: t('scientificBackground'),
    detailedDescription: t('detailedDescription'),
    advantagesOverExisting: t('advantagesOverExisting'),
    potentialUsesAndImplementation: t('potentialUsesAndImplementation'),
    additionalResearchProgram: t('additionalResearchProgram'),
    referenceList: t('referenceList'),
  };

  const inventors = formData.inventors?.length ? formData.inventors : [EMPTY_INVENTOR];
  const fundingSources = formData.fundingSources?.length ? formData.fundingSources : [EMPTY_FUNDING];
  const priorArtPatents = formData.priorArtPatents?.length ? formData.priorArtPatents : [EMPTY_PRIOR_PATENT];
  const priorArtPublications = formData.priorArtPublications?.length ? formData.priorArtPublications : [EMPTY_PRIOR_PUBLICATION];

  return (
    <>
      <div className="form-section" id="patent-doi-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{t('doiFormTitle', 'טופס גילוי המצאה (DOI)')}</h2>
          {onPolish && (
            <AIPolishButton fields={polishFields} fieldLabels={polishLabels} onApply={onPolish} lang={lang} />
          )}
        </div>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: 0 }}>
          {t('doiFormSubtitle', 'שדות לפי טופס גילוי המצאה JCE – מומלץ למלא באנגלית')}
        </p>

        <div className="form-row">
          <div className="form-group">
            <label>{t('inventionTitleEnglish', 'שם המצאה (אנגלית)')}</label>
            <input type="text" name="inventionTitleEnglish" value={formData.inventionTitleEnglish || ''} onChange={handleChange} dir="ltr" />
          </div>
          <div className="form-group">
            <label>{t('inventionTitleHebrew', 'שם המצאה (עברית)')}</label>
            <input type="text" name="inventionTitleHebrew" value={formData.inventionTitleHebrew || ''} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label>{t('shortDescriptionInvention', 'תיאור קצר של המצאה (אנגלית)')}</label>
          <DirTextarea name="shortDescription" value={formData.shortDescription || ''} onChange={handleChange} rows={4} />
        </div>

        <div className="form-group">
          <label>{t('inventionTypeElaboration', '2a. האם המצאה היא מוצר/תהליך/שיטה? פרט (אנגלית)')}</label>
          <DirTextarea name="inventionTypeElaboration" value={formData.inventionTypeElaboration || ''} onChange={handleChange} rows={3} />
        </div>

        <div className="form-group">
          <label>{t('potentialCustomers', '2b. מי הלקוחות/צרכנים/משתמשים הפוטנציאליים? (אנגלית)')}</label>
          <DirTextarea name="potentialCustomers" value={formData.potentialCustomers || ''} onChange={handleChange} rows={3} />
        </div>

        <div className="form-group">
          <label>{t('commercialEntityContacts', '2c. האם היו קשרים עם גורם מסחרי בנוגע להמצאה? פרט (אנגלית)')}</label>
          <DirTextarea name="commercialEntityContacts" value={formData.commercialEntityContacts || ''} onChange={handleChange} rows={3} />
        </div>
      </div>

      <div className="form-section">
        <h2>{t('inventorsContributors', 'ממציאים (תורמים)')}</h2>
        <div className="form-group">
          <label>{t('hasInventorsQuestion', 'האם קיימים ממציאים (תורמים)?')}</label>
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="radio"
                name="hasInventors"
                checked={hasInventors === true}
                onChange={() => onHasInventorsYes?.()}
              />
              {t('yes', 'כן')}
            </label>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="radio"
                name="hasInventors"
                checked={hasInventors === false}
                onChange={() => setHasInventors(false)}
              />
              {t('no', 'לא')}
            </label>
          </div>
        </div>

        {hasInventors && (
          <>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: 0 }}>
              {t('inventorsOrderNote', 'סדר הופעת הממציאים בטופס יישמר בבקשת הפטנט. התקשורת תופנה לממציא הראשון ברשימה.')}
            </p>

            {inventors.map((inventor, index) => (
          <div key={`inventor-${index}`} className="partner-group">
            <h3>{t('inventor', 'ממציא')} / {t('contributor', 'תורם')} {index + 1}</h3>
            <div className="form-row">
              <div className="form-group">
                <label>{t('titleAndName', 'תואר, שם')}</label>
                <input type="text" value={inventor.title || ''} onChange={(e) => handleInventorChange(index, 'title', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('fullName', 'שם מלא')}</label>
                <input type="text" value={inventor.name || ''} onChange={(e) => handleInventorChange(index, 'name', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('nationalId', 'ת.ז.')}</label>
                <input type="text" value={inventor.nationalId || ''} onChange={(e) => handleInventorChange(index, 'nationalId', e.target.value)} dir="ltr" />
              </div>
              <div className="form-group">
                <label>{t('inventorEmail', 'אימייל')}</label>
                <input type="email" value={inventor.email || ''} onChange={(e) => handleInventorChange(index, 'email', e.target.value)} dir="ltr" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('department', 'מחלקה')}</label>
                <input type="text" value={inventor.department || ''} onChange={(e) => handleInventorChange(index, 'department', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('inventorInstitution', 'מוסד')}</label>
                <input type="text" value={inventor.institution || ''} onChange={(e) => handleInventorChange(index, 'institution', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('partInInvention', 'חלק בהמצאה (%)')}</label>
                <input type="text" value={inventor.partInInvention || ''} onChange={(e) => handleInventorChange(index, 'partInInvention', e.target.value)} dir="ltr" />
              </div>
              <div className="form-group">
                <label>{t('inventorOrContributor', 'ממציא או תורם')}</label>
                <select value={inventor.roleType || 'inventor'} onChange={(e) => handleInventorChange(index, 'roleType', e.target.value)}>
                  <option value="inventor">{t('inventor', 'ממציא')}</option>
                  <option value="contributor">{t('contributor', 'תורם')}</option>
                </select>
              </div>
            </div>
            {inventors.length > 1 && (
              <button type="button" onClick={() => removeInventor(index)} className="remove-btn">
                {t('removeInventor', 'הסר ממציא')}
              </button>
            )}
          </div>
        ))}
            <button type="button" onClick={addInventor} className="add-btn">+ {t('addInventor', 'הוסף ממציא')}</button>
          </>
        )}
      </div>

      <div className="form-section">
        <h2>{t('inventionDates', 'תאריכי המצאה')}</h2>
        <div className="form-group">
          <label>{t('inventionFirstDate', '4a. תאריך ראשון שבו נעשתה המצאה או עבודה קשורה')}</label>
          <div className="date-input-group">
            <input
              type="text"
              value={formData.inventionFirstDate || ''}
              onChange={(e) => handleInventionDateChange(e.target.value)}
              placeholder="dd/mm/yyyy"
              inputMode="numeric"
              maxLength="10"
              dir="ltr"
            />
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input
                type="date"
                ref={inventionDatePickerRef}
                value={convertDateToISO(formData.inventionFirstDate) || ''}
                onChange={(e) => handleInventionDatePickerChange(e.target.value)}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
              />
              <div style={{ cursor: 'pointer', fontSize: '20px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', border: '2px solid #e9ecef', borderRadius: '8px', minWidth: '40px', height: '40px', pointerEvents: 'none' }}>📅</div>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>{t('inventionTimeFrame', 'אם אין תאריך מדויק – ציין מסגרת זמן (אנגלית)')}</label>
          <input type="text" name="inventionTimeFrame" value={formData.inventionTimeFrame || ''} onChange={handleChange} dir="ltr" />
        </div>
        <div className="form-group">
          <label>{t('inventionWorkType', '4b. סוג העבודה שבוצעה (אנגלית)')}</label>
          <textarea name="inventionWorkType" value={formData.inventionWorkType || ''} onChange={handleChange} rows={2} placeholder={t('inventionWorkTypePlaceholder')} dir="ltr" />
        </div>
      </div>

      <div className="form-section">
        <h2>{t('fundingSupportMaterials', 'מימון, תמיכה וחומרים')}</h2>
        <div className="form-group">
          <label>{t('fundingSupportType', 'סוג התמיכה')}</label>
          <select name="fundingSupportType" value={formData.fundingSupportType || ''} onChange={handleChange}>
            <option value="">{t('selectOption', 'בחר')}</option>
            <option value="not_supported">{t('fundingNotSupported', 'ללא תמיכה')}</option>
            <option value="grant">{t('fundingGrant', 'מענק (קרנות, EU, NIH, BSF וכו׳)')}</option>
            <option value="grant_company">{t('fundingGrantCompany', 'מענק ו/או הסכם עם חברה (רשות החדשנות, קמין, נופר וכו׳)')}</option>
            <option value="other">{t('fundingOther', 'מקורות אחרים')}</option>
          </select>
        </div>

        {formData.fundingSupportType && formData.fundingSupportType !== 'not_supported' && (
          <>
            <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{t('fundingSourcesTable', 'מקורות תמיכה')}</p>
            {fundingSources.map((row, index) => (
              <div key={`funding-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '10px', background: '#fafafa' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('sourceOfSupport', 'מקור תמיכה (קרן/חברה)')}</label>
                    <input type="text" value={row.source || ''} onChange={(e) => handleFundingSourceChange(index, 'source', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('supportPeriod', 'תקופת תמיכה')}</label>
                    <input type="text" value={row.supportPeriod || ''} onChange={(e) => handleFundingSourceChange(index, 'supportPeriod', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('grantNumber', 'מספר מענק')}</label>
                    <input type="text" value={row.grantNumber || ''} onChange={(e) => handleFundingSourceChange(index, 'grantNumber', e.target.value)} dir="ltr" />
                  </div>
                  <div className="form-group">
                    <label>{t('subjectComments', 'נושא/הערות (כולל התחייבויות)')}</label>
                    <input type="text" value={row.subjectComments || ''} onChange={(e) => handleFundingSourceChange(index, 'subjectComments', e.target.value)} />
                  </div>
                </div>
                {fundingSources.length > 1 && (
                  <button type="button" onClick={() => removeFundingSource(index)} className="remove-btn">{t('remove', 'הסר')}</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addFundingSource} className="add-btn">+ {t('addFundingSource', 'הוסף מקור תמיכה')}</button>
          </>
        )}
      </div>

      <div className="form-section">
        <h2>{t('nonJceMaterials', 'שימוש בחומרים שאינם של JCE')}</h2>
        <div className="form-group">
          <label>{t('nonJceMaterialsUsed', 'האם נעשה שימוש בחומרים/תהליכים שאינם מ-JCE?')}</label>
          <YesNoRadio
            name="nonJceMaterialsUsed"
            value={formData.nonJceMaterialsUsed || ''}
            onChange={(val) => handleChange({ target: { name: 'nonJceMaterialsUsed', value: val } })}
            t={t}
          />
        </div>
        {formData.nonJceMaterialsUsed === 'yes' && (
          <div className="form-group">
            <label>{t('nonJceMaterialsDetails', 'פרט חומרים/תהליכים (אנגלית)')}</label>
            <textarea name="nonJceMaterialsDetails" value={formData.nonJceMaterialsDetails || ''} onChange={handleChange} rows={4} dir="ltr" />
          </div>
        )}
      </div>

      <div className="form-section">
        <h2>{t('publicationSection', 'פרסום')}</h2>
        <div className="form-group">
          <label>{t('hasBeenPublished', 'האם המצאה או חלק ממנה פורסמו?')}</label>
          <YesNoRadio
            name="hasBeenPublished"
            value={formData.hasBeenPublished || ''}
            onChange={(val) => handleChange({ target: { name: 'hasBeenPublished', value: val } })}
            t={t}
          />
        </div>
        {formData.hasBeenPublished === 'yes' && (
          <div className="form-group">
            <label>{t('publicationDetails', 'פרט את כל הפרטים הזמינים (אנגלית)')}</label>
            <textarea name="publicationDetails" value={formData.publicationDetails || ''} onChange={handleChange} rows={4} dir="ltr" />
          </div>
        )}
        {formData.hasBeenPublished === 'no' && (
          <div className="form-group">
            <label>{t('futurePublicationPlans', 'תוכניות פרסום עתידיות (אנגלית)')}</label>
            <textarea name="futurePublicationPlans" value={formData.futurePublicationPlans || ''} onChange={handleChange} rows={3} dir="ltr" />
          </div>
        )}
      </div>

      <div className="form-section">
        <h2>{t('priorPatentApplication', 'בקשת פטנט קודמת')}</h2>
        <div className="form-group">
          <label>{t('priorPatentFiled', 'האם הוגשה בקשת פטנט להמצאה?')}</label>
          <YesNoRadio
            name="priorPatentFiled"
            value={formData.priorPatentFiled || ''}
            onChange={(val) => handleChange({ target: { name: 'priorPatentFiled', value: val } })}
            t={t}
          />
        </div>
        {formData.priorPatentFiled === 'yes' && (
          <div className="form-group">
            <label>{t('priorPatentDetails', 'פרט (מספר, כותרת, ממציאים, תאריך ומדינה)')}</label>
            <textarea name="priorPatentDetails" value={formData.priorPatentDetails || ''} onChange={handleChange} rows={3} dir="ltr" />
          </div>
        )}
      </div>

      <div className="form-section">
        <h2>{t('priorArtLiterature', 'סקירת ספרות ו-Prior Art')}</h2>
        <div className="form-group">
          <label>{t('literatureSurveyPerformed', 'האם בוצעה סקירת ספרות מורחבת בתחום?')}</label>
          <YesNoRadio
            name="literatureSurveyPerformed"
            value={formData.literatureSurveyPerformed || ''}
            onChange={(val) => handleChange({ target: { name: 'literatureSurveyPerformed', value: val } })}
            t={t}
          />
        </div>
        {formData.literatureSurveyPerformed === 'yes' && (
          <div className="form-group">
            <label>{t('literatureSurveyNotes', 'הערות סקירת ספרות (אנגלית)')}</label>
            <textarea name="literatureSurveyNotes" value={formData.literatureSurveyNotes || ''} onChange={handleChange} rows={3} dir="ltr" />
          </div>
        )}

        <h3 style={{ marginTop: '20px' }}>{t('priorArtPatents', 'פטנטים')}</h3>
        {priorArtPatents.map((row, index) => (
          <div key={`prior-patent-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '10px', background: '#fafafa' }}>
            <div className="form-row">
              <div className="form-group">
                <label>{t('country', 'מדינה')}</label>
                <input type="text" value={row.country || ''} onChange={(e) => handlePriorArtPatentChange(index, 'country', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('patentPublicationNumber', 'מספר פטנט/פרסום')}</label>
                <input type="text" value={row.publicationNumber || ''} onChange={(e) => handlePriorArtPatentChange(index, 'publicationNumber', e.target.value)} dir="ltr" />
              </div>
            </div>
            <div className="form-group">
              <label>{t('title', 'כותרת')}</label>
              <input type="text" value={row.title || ''} onChange={(e) => handlePriorArtPatentChange(index, 'title', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('filingPublicationDate', 'תאריך הגשה/פרסום')}</label>
                <input type="text" value={row.filingPublicationDate || ''} onChange={(e) => handlePriorArtPatentChange(index, 'filingPublicationDate', e.target.value)} dir="ltr" />
              </div>
              <div className="form-group">
                <label>{t('relevance', 'רלוונטיות')}</label>
                <input type="text" value={row.relevance || ''} onChange={(e) => handlePriorArtPatentChange(index, 'relevance', e.target.value)} />
              </div>
            </div>
            {priorArtPatents.length > 1 && (
              <button type="button" onClick={() => removePriorArtPatent(index)} className="remove-btn">{t('remove', 'הסר')}</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addPriorArtPatent} className="add-btn">+ {t('addPriorArtPatent', 'הוסף פטנט')}</button>

        <h3 style={{ marginTop: '20px' }}>{t('priorArtPublications', 'פרסומים אחרים')}</h3>
        {priorArtPublications.map((row, index) => (
          <div key={`prior-pub-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '10px', background: '#fafafa' }}>
            <div className="form-group">
              <label>{t('title', 'כותרת')}</label>
              <input type="text" value={row.title || ''} onChange={(e) => handlePriorArtPublicationChange(index, 'title', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('authors', 'מחברים')}</label>
                <input type="text" value={row.authors || ''} onChange={(e) => handlePriorArtPublicationChange(index, 'authors', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('placeOfPublication', 'מקום פרסום')}</label>
                <input type="text" value={row.placeOfPublication || ''} onChange={(e) => handlePriorArtPublicationChange(index, 'placeOfPublication', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('publicationDate', 'תאריך פרסום')}</label>
                <input type="text" value={row.publicationDate || ''} onChange={(e) => handlePriorArtPublicationChange(index, 'publicationDate', e.target.value)} dir="ltr" />
              </div>
              <div className="form-group">
                <label>{t('publishedByInventor', 'פורסם על ידי ממציא?')}</label>
                <select value={row.publishedByInventor || ''} onChange={(e) => handlePriorArtPublicationChange(index, 'publishedByInventor', e.target.value)}>
                  <option value="">{t('selectOption', 'בחר')}</option>
                  <option value="yes">{t('yes', 'כן')}</option>
                  <option value="no">{t('no', 'לא')}</option>
                </select>
              </div>
            </div>
            {priorArtPublications.length > 1 && (
              <button type="button" onClick={() => removePriorArtPublication(index)} className="remove-btn">{t('remove', 'הסר')}</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addPriorArtPublication} className="add-btn">+ {t('addPriorArtPublication', 'הוסף פרסום')}</button>
      </div>

      <div className="form-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{t('detailedInventionDescription', 'תיאור מפורט של המצאה (אופציונלי)')}</h2>
          {onPolish && (
            <AIPolishButton
              fields={detailedPolishFields}
              fieldLabels={detailedPolishLabels}
              onApply={onPolish}
            />
          )}
        </div>
        <div className="form-group">
          <label>{t('scientificBackground', 'רקע מדעי ופרסומים מדעיים (אנגלית)')}</label>
          <DirTextarea name="scientificBackground" value={formData.scientificBackground || ''} onChange={handleChange} rows={5} />
        </div>
        <div className="form-group">
          <label>{t('detailedDescription', 'תיאור מפורט של המצאה (אנגלית)')}</label>
          <DirTextarea name="detailedDescription" value={formData.detailedDescription || ''} onChange={handleChange} rows={6} />
        </div>
        <div className="form-group">
          <label>{t('advantagesOverExisting', 'יתרונות המצאה על פני הידע והשימושים הקיימים (אנגלית)')}</label>
          <DirTextarea name="advantagesOverExisting" value={formData.advantagesOverExisting || ''} onChange={handleChange} rows={4} />
        </div>
        <div className="form-group">
          <label>{t('potentialUsesAndImplementation', 'שימושים פוטנציאליים ויישום (אנגלית)')}</label>
          <DirTextarea name="potentialUsesAndImplementation" value={formData.potentialUsesAndImplementation || ''} onChange={handleChange} rows={4} />
        </div>
        <div className="form-group">
          <label>{t('additionalResearchProgram', 'תוכנית מחקר נוספת לפיתוח המצאה (אנגלית)')}</label>
          <DirTextarea name="additionalResearchProgram" value={formData.additionalResearchProgram || ''} onChange={handleChange} rows={4} />
        </div>
        <div className="form-group">
          <label>{t('referenceList', 'רשימת מקורות (אנגלית)')}</label>
          <DirTextarea name="referenceList" value={formData.referenceList || ''} onChange={handleChange} rows={4} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t('developmentBudgetEstimate', 'תקציב משוער לפיתוח (דולר לשנה)')}</label>
            <input type="text" name="developmentBudgetEstimate" value={formData.developmentBudgetEstimate || ''} onChange={handleChange} dir="ltr" />
          </div>
          <div className="form-group">
            <label>{t('developmentTimeEstimate', 'זמן משוער לפיתוח')}</label>
            <input type="text" name="developmentTimeEstimate" value={formData.developmentTimeEstimate || ''} onChange={handleChange} dir="ltr" />
          </div>
        </div>
      </div>
    </>
  );
};

export default PatentDisclosureSection;
