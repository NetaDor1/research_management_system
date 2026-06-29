import { Timestamp } from 'firebase/firestore';
import { normalizeResearchStatus } from './submissionStatus';

export const parseDurationYears = (value) => {
  const years = Number(String(value ?? '').replace(',', '.'));
  return Number.isNaN(years) || years <= 0 ? null : years;
};

export const toJsDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const addYearsToDate = (startDate, years) => {
  const end = new Date(startDate);
  const wholeYears = Math.floor(years);
  const fractional = years - wholeYears;
  end.setFullYear(end.getFullYear() + wholeYears);
  if (fractional > 0) {
    end.setDate(end.getDate() + Math.round(fractional * 365));
  }
  return end;
};

export const buildAwardedPeriodFields = (durationYears, approvalDate = new Date()) => {
  const years = parseDurationYears(durationYears);
  if (!years) return {};
  const start = approvalDate;
  const end = addYearsToDate(start, years);
  return {
    researchStartDate: Timestamp.fromDate(start),
    researchEndDate: Timestamp.fromDate(end),
  };
};

export const isResearchAwarded = (researchData) =>
  normalizeResearchStatus(researchData?.status) === 'awarded';

export const getAwardedPeriodUpdate = (researchData, nextStatus) => {
  if (nextStatus !== 'awarded') return {};
  if (isResearchAwarded(researchData)) return {};
  return buildAwardedPeriodFields(researchData?.researchDurationYears);
};

export const resolveResearchPeriodDates = (researchData) => {
  const durationYears = parseDurationYears(researchData?.researchDurationYears);
  const startDate = toJsDate(researchData?.researchStartDate);
  let endDate = toJsDate(researchData?.researchEndDate);

  if (startDate && durationYears && !endDate) {
    endDate = addYearsToDate(startDate, durationYears);
  }

  return { durationYears, startDate, endDate };
};

/** Show duration-years field in the form until the proposal is awarded. */
export const canShowResearchPeriodInForm = (isEdit, existingData) => {
  if (!isEdit) return true;
  if (!existingData) return false;
  return !isResearchAwarded(existingData);
};
