export const SUBMISSION_DRAFT = 'draft';
export const SUBMISSION_SUBMITTED = 'submitted';

export const getSubmissionStatus = (data) =>
  data?.submissionStatus === SUBMISSION_DRAFT ? SUBMISSION_DRAFT : SUBMISSION_SUBMITTED;

export const isDraft = (data) => getSubmissionStatus(data) === SUBMISSION_DRAFT;

export const isSubmitted = (data) => !isDraft(data);

export const filterSubmittedOnly = (docs) =>
  docs.filter((doc) => isSubmitted(typeof doc.data === 'function' ? doc.data() : doc));

export const canResearcherEditResearch = (data) => {
  if (!data) return false;
  if (isDraft(data)) return true;
  return (data.status || 'pending') === 'pending';
};

export const canDeleteResearch = (data) => {
  if (!data) return false;
  if (isDraft(data)) return true;
  return (data.status || 'pending') === 'pending';
};

export const canResearcherEditPatent = (data) => {
  if (!data) return false;
  if (isDraft(data)) return true;
  return (data.status || 'in-process') === 'in-process';
};

export const canResearcherEditArticle = (data) => {
  if (!data) return false;
  if (isDraft(data)) return true;
  return (data.status || 'published') !== 'rejected';
};

export const canDeletePatent = (data) => {
  if (!data) return false;
  if (isDraft(data)) return true;
  return (data.status || 'in-process') === 'in-process';
};

export const canDeleteArticle = (data) => {
  if (!data) return false;
  return canResearcherEditArticle(data);
};
