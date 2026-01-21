// Helper function to identify if a fund is Israeli or international
export const isIsraeliFund = (fundName) => {
  if (!fundName) return false;
  
  const israeliFunds = [
    'הקרן הלאומית למדע ISF',
    'הקרן הדו-לאומית למדע BSF',
    'הקרן הגרמנית-ישראלית למחקר ופיתוח GIF',
    'משרד החדשנות, המדע והטכנולוגיה MOST',
    'משרד הבריאות MOH',
    'הקרן לחקר הסרטן ICRF',
    'הקרן הדו-לאומית למחקר ופיתוח חקלאי BARD',
    'שיתוף פעולה גרמניה-ישראל DIP',
    'רשות המים - המדען הראשי',
    'רשות האנרגיה והתשתיות - המדען הראשי',
    'המשרד לאיכות הסביבה - המדען הראשי',
    'משרד החקלאות וההתיישבות הכפרית',
    'מכון וולקני',
    'האגודה למלחמה בסרטן',
    'אלו"ט',
    'קרן "שלם"',
    'קרן קיימת לישראל קק"ל',
    'מו"פ מדבר יהודה וים המלח',
    'המרכז למחקרי סביבה וקיימות',
    'קרן פזי',
    'מכון אלי הורביץ לניהול אסטרטגי',
    'מרכז לדאטה ובינה מלאכותית - אונ\' תל אביב'
  ];
  
  return israeliFunds.some(fund => fundName.includes(fund));
};

export const isInternationalFund = (fundName) => {
  if (!fundName) return false;
  
  const internationalFunds = [
    'האיחוד האירופי Horizon',
    'המכון הלאומי לבריאות (ארה"ב) - NIH',
    'הקרן הגרמנית למחקר DFG',
    'HFSP - Human Frontiers Science Project',
    'Volfswagen Stiftung',
    'Spencer Foundation for Research in Education'
  ];
  
  return internationalFunds.some(fund => fundName.includes(fund));
};

// Helper function to convert Firestore Timestamp to date string
export const toDateString = (timestamp) => {
  if (!timestamp) return '';
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString().split('T')[0];
  }
  if (timestamp && timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString().split('T')[0];
  }
  return String(timestamp);
};

// Helper function to extract year from date
export const getYear = (dateString) => {
  if (!dateString) return null;
  try {
    return new Date(dateString).getFullYear();
  } catch {
    return null;
  }
};

// Helper function to extract academic year
export const getAcademicYear = (academicYearString) => {
  return academicYearString || null;
};
