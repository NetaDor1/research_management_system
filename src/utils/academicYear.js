const HEBREW_ACADEMIC_YEARS = ['תשפ"א', 'תשפ"ב', 'תשפ"ג', 'תשפ"ד', 'תשפ"ה', 'תשפ"ו', 'תשפ"ז', 'תשפ"ח', 'תשפ"ט', 'תש"צ'];
const BASE_HEBREW_YEAR = 5781; // תשפ"א

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value && value.seconds) {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getHebrewAcademicYearFromDate = (dateInput) => {
  const date = toDate(dateInput);
  if (!date) return '';

  const month = date.getMonth() + 1;
  const gregorianAcademicYear = month >= 10 ? date.getFullYear() + 1 : date.getFullYear();
  const hebrewYear = gregorianAcademicYear - 3760;
  const index = ((hebrewYear - BASE_HEBREW_YEAR) % 10 + 10) % 10;
  return HEBREW_ACADEMIC_YEARS[index];
};

export const normalizeAcademicYear = (academicYearValue, startDateValue) => {
  const raw = typeof academicYearValue === 'string' ? academicYearValue.trim() : '';
  const validHebrewAcademicYearPattern = /^תש["״][א-ת]$/;
  if (validHebrewAcademicYearPattern.test(raw)) {
    return raw;
  }

  const fallback = getHebrewAcademicYearFromDate(startDateValue);
  if (fallback) return fallback;
  return raw || '';
};

