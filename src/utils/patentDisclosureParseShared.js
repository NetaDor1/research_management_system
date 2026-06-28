export const FUNDING_OPTION_PATTERNS = [
  { pattern: /not supported/i, value: 'not_supported' },
  { pattern: /supported by a grant \[foundations/i, value: 'grant' },
  { pattern: /agreement with a company/i, value: 'grant_company' },
  { pattern: /other sources/i, value: 'other' },
];

export function normalizeLine(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeDateToDisplay(value) {
  const v = normalizeLine(value);
  if (!v || /click here to enter/i.test(v)) return '';

  const ddmmyyyy = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) return v;

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const day = us[2].padStart(2, '0');
    const month = us[1].padStart(2, '0');
    return `${day}/${month}/${us[3]}`;
  }

  return v;
}

export function parseRoleType(value) {
  const v = normalizeLine(value).toLowerCase();
  if (!v) return 'inventor';
  if (v === '2' || v.includes('contributor')) return 'contributor';
  return 'inventor';
}

export function isTemplateText(text) {
  const line = normalizeLine(text);
  if (!line) return true;
  return (
    /^instructions:/i.test(line)
    || /^to be submitted through/i.test(line)
    || /^disclosure of invention form/i.test(line)
    || /^title,\s*name/i.test(line)
    || /^inventor:?/i.test(line)
    || /^contributor:/i.test(line)
    || /^source of support/i.test(line)
    || /^none used$/i.test(line)
    || /^none known$/i.test(line)
    || /^yes,\s*prior references/i.test(line)
    || /^yes,\s*materials or processes/i.test(line)
    || /^i{1,3}\.\s*$/i.test(line)
    || /^not supported$/i.test(line)
    || /^other sources$/i.test(line)
    || /^country$/i.test(line)
    || /^authors$/i.test(line)
    || /^department$/i.test(line)
    || /^relevance$/i.test(line)
    || /^grant number$/i.test(line)
    || /^support period$/i.test(line)
    || /^publication date$/i.test(line)
    || /^published by inventor/i.test(line)
    || /^place of publication/i.test(line)
    || /^part in invention/i.test(line)
    || /^inventor1 or contributor/i.test(line)
    || /^patent\/\s*publication number/i.test(line)
    || /^filing\/\s*publication date/i.test(line)
    || /^subject\/comments/i.test(line)
    || /supported by a grant/i.test(line)
    || /^notes:/i.test(line)
    || /^please /i.test(line)
    || /^if yes/i.test(line)
    || /^if no/i.test(line)
    || /^o\s+"/i.test(line)
    || /^patents:/i.test(line)
    || /^other publications/i.test(line)
    || /^optional:/i.test(line)
    || /^date:/i.test(line)
  );
}

export function isPatentPdfNoiseLine(line) {
  const text = normalizeLine(line);
  if (!text) return true;
  if (isTemplateText(text)) return true;
  if (/^mail\s*:/i.test(text)) return true;
  if (/patents@jce\.ac\.il/i.test(text)) return true;
  if (/^format via/i.test(text)) return true;
  if (/^completed form to/i.test(text)) return true;
  if (/^in english\s*\./i.test(text)) return true;
  if (/^disclosure\s+f\s*orm/i.test(text)) return true;
  if (/^u\.s\. patent law/i.test(text)) return true;
  if (/^determining inventorship/i.test(text)) return true;
  if (/^conception of the invention/i.test(text)) return true;
  if (/^the inventors are hereby obligated/i.test(text)) return true;
  if (/^attach a separate/i.test(text)) return true;
  if (/^following items/i.test(text)) return true;
  if (/^[a-h]\)\s/i.test(text)) return true;
  return false;
}

export function createEmptyPatentDisclosureParsed() {
  return {
    inventionTitleEnglish: '',
    inventionTitleHebrew: '',
    shortDescription: '',
    inventionTypeElaboration: '',
    potentialCustomers: '',
    commercialEntityContacts: '',
    inventors: [],
    inventionFirstDate: '',
    inventionTimeFrame: '',
    inventionWorkType: '',
    fundingSupportType: '',
    fundingSources: [],
    nonJceMaterialsUsed: '',
    nonJceMaterialsDetails: '',
    hasBeenPublished: '',
    publicationDetails: '',
    futurePublicationPlans: '',
    priorPatentFiled: '',
    priorPatentDetails: '',
    literatureSurveyPerformed: '',
    literatureSurveyNotes: '',
    priorArtPatents: [],
    priorArtPublications: [],
    scientificBackground: '',
    detailedDescription: '',
    advantagesOverExisting: '',
    potentialUsesAndImplementation: '',
    additionalResearchProgram: '',
    referenceList: '',
    developmentBudgetEstimate: '',
    developmentTimeEstimate: '',
  };
}

export function validateParsed(parsed) {
  const hasContent = Boolean(
    parsed.inventionTitleEnglish
    || parsed.inventionTitleHebrew
    || parsed.shortDescription
    || parsed.inventionTypeElaboration
    || parsed.potentialCustomers
    || parsed.commercialEntityContacts
    || parsed.inventors?.length
    || parsed.inventionFirstDate
    || parsed.inventionTimeFrame
    || parsed.inventionWorkType
    || parsed.fundingSupportType
    || parsed.fundingSources?.length
    || parsed.nonJceMaterialsUsed
    || parsed.hasBeenPublished
    || parsed.priorPatentFiled
    || parsed.literatureSurveyPerformed
    || parsed.priorArtPatents?.length
    || parsed.priorArtPublications?.length
    || parsed.scientificBackground
    || parsed.detailedDescription
  );

  if (!hasContent) {
    throw new Error(
      'לא נמצא תוכן לייבוא בקובץ. ודאו שמילאתם את טופס גילוי ההמצאה (DOI) לפני ההעלאה.'
    );
  }
}
