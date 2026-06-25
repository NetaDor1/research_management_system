const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const NEW_BADGE_DAYS = 14;

const toDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

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

export const shouldShowNewBadge = (isNew, createdDate) => {
  if (!isNew) return false;

  const createdAt = toDate(createdDate);
  if (!createdAt) return false;

  const now = Date.now();
  const ageMs = now - createdAt.getTime();

  if (ageMs < 0) return true;
  return ageMs <= NEW_BADGE_DAYS * DAY_IN_MS;
};

