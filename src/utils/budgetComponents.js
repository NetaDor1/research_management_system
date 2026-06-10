import translations from '../i18n/translations';

const BUDGET_COMPONENT_IDS = [
  'budgetPersonnel',
  'budgetEquipment',
  'budgetConsumables',
  'budgetComputers',
  'budgetTravel',
  'budgetConferences',
  'budgetPatents',
  'budgetMisc',
  'budgetOverhead',
];

const LEGACY_LABEL_MAP = {
  'כ"א (כוח אדם)': 'budgetPersonnel',
  'ציוד': 'budgetEquipment',
  'נסיעות': 'budgetTravel',
};

const buildLabelToIdMap = () => {
  const map = { ...LEGACY_LABEL_MAP };

  BUDGET_COMPONENT_IDS.forEach((id) => {
    const heLabel = translations.he[id];
    const enLabel = translations.en[id];
    if (heLabel) map[heLabel] = id;
    if (enLabel) map[enLabel] = id;
  });

  return map;
};

const LABEL_TO_ID = buildLabelToIdMap();

/**
 * Translates a stored budget-component key (Hebrew, English, or legacy) for display.
 */
export const getBudgetComponentLabel = (storedKey, t) => {
  if (!storedKey) return '';
  const translationId = LABEL_TO_ID[storedKey];
  if (translationId) {
    return t(translationId, storedKey);
  }
  return storedKey;
};

export const BUDGET_COMPONENT_TRANSLATION_IDS = BUDGET_COMPONENT_IDS;
