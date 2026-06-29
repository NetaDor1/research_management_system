export const PATENT_STATUS_PROVISIONAL = 'provisional';

export const PATENT_STATUS_OPTIONS = [
  { value: 'provisional', labelKey: 'patentStatusProvisional', defaultLabel: 'Provisional' },
  { value: 'pct', labelKey: 'patentStatusPct', defaultLabel: 'PCT' },
  { value: 'refiling', labelKey: 'patentStatusRefiling', defaultLabel: 'Refiling' },
  { value: 'national-phase', labelKey: 'patentStatusNationalPhase', defaultLabel: 'National Phase' },
  { value: 'national-phase-eu', labelKey: 'patentStatusNationalPhaseEu', defaultLabel: 'National Phase EU' },
  { value: 'national-phase-us', labelKey: 'patentStatusNationalPhaseUs', defaultLabel: 'National Phase US' },
  { value: 'national-phase-il', labelKey: 'patentStatusNationalPhaseIl', defaultLabel: 'National Phase IL' },
  { value: 'national-phase-other', labelKey: 'patentStatusNationalPhaseOther', defaultLabel: 'National Phase Other' },
  { value: 'national-examination', labelKey: 'patentStatusNationalExamination', defaultLabel: 'National Examination' },
  { value: 'patent-granted', labelKey: 'patentStatusPatentGranted', defaultLabel: 'Patent Granted' },
];

const LEGACY_STATUS_MAP = {
  'in-process': 'provisional',
  registered: 'patent-granted',
  approved: 'patent-granted',
  rejected: 'provisional',
};

export const normalizePatentStatus = (status) => {
  if (!status) return PATENT_STATUS_PROVISIONAL;
  if (LEGACY_STATUS_MAP[status]) return LEGACY_STATUS_MAP[status];
  if (PATENT_STATUS_OPTIONS.some((option) => option.value === status)) return status;
  return status;
};

export const getPatentStatusLabel = (status, t) => {
  if (status === 'draft') return t('draft', 'טיוטה');
  const normalized = normalizePatentStatus(status);
  const match = PATENT_STATUS_OPTIONS.find((option) => option.value === normalized);
  if (match) return t(match.labelKey, match.defaultLabel);
  return status || t('notSpecified', 'לא צוין');
};

export const getPatentStatusClass = (status) => {
  if (status === 'draft') return 'status-draft';
  const normalized = normalizePatentStatus(status);
  if (normalized === 'patent-granted') return 'status-awarded';
  return 'status-pending';
};
