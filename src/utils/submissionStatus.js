import { normalizePatentStatus, PATENT_STATUS_PROVISIONAL } from './patentStatuses';

export const SUBMISSION_DRAFT = 'draft';
export const SUBMISSION_SUBMITTED = 'submitted';

export const getSubmissionStatus = (data) =>
  data?.submissionStatus === SUBMISSION_DRAFT ? SUBMISSION_DRAFT : SUBMISSION_SUBMITTED;

export const isDraft = (data) => getSubmissionStatus(data) === SUBMISSION_DRAFT;

export const isSubmitted = (data) => !isDraft(data);

export const filterSubmittedOnly = (docs) =>
  docs.filter((doc) => isSubmitted(typeof doc.data === 'function' ? doc.data() : doc));

export const normalizeResearchStatus = (status) => {
  if (status === 'submitted' || status === 'pending' || status === 'awarded' || status === 'rejected') {
    return status;
  }
  return status || 'pending';
};

export const canResearcherEditResearch = (data) => {
  if (!data) return false;
  if (isDraft(data)) return true;
  const status = normalizeResearchStatus(data.status);
  return status === 'submitted' || status === 'pending';
};

export const canDeleteResearch = (data) => {
  if (!data) return false;
  if (isDraft(data)) return true;
  const status = normalizeResearchStatus(data.status);
  return status === 'submitted' || status === 'pending';
};

export const canResearcherEditPatent = (data) => {
  if (!data) return false;
  if (isDraft(data)) return true;
  return normalizePatentStatus(data.status) !== 'patent-granted';
};

export const canResearcherEditArticle = (data) => {
  if (!data) return false;
  if (isDraft(data)) return true;
  const status = data.status || 'submitted';
  return status === 'submitted' || status === 'pending';
};

export const canDeletePatent = (data) => {
  if (!data) return false;
  if (isDraft(data)) return true;
  return normalizePatentStatus(data.status) === PATENT_STATUS_PROVISIONAL;
};

export const canDeleteArticle = (data) => {
  if (!data) return false;
  return canResearcherEditArticle(data);
};
