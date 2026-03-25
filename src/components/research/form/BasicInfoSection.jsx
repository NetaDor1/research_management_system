import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

const BasicInfoSection = ({ formData, errors, handleChange, fundOptions, fundTypeOptions, submissionPathOptions, submissionTypeOptions, researcherRoleOptions, proposalStageOptions }) => {
  const { t } = useLanguage();

  return (
    <div className="form-section">
      <h2>{t('generalDetails', 'פרטים כלליים')}</h2>
      
      <div className="form-group">
        <label htmlFor="projectTitle">
          {t('projectTitleLabel', 'כותרת הפרוייקט שהוגש לקרן חיצונית')} <span className="required">*</span>
        </label>
        <input
          type="text"
          id="projectTitle"
          name="projectTitle"
          value={formData.projectTitle}
          onChange={handleChange}
          className={errors.projectTitle ? 'error' : ''}
          placeholder={t('enterProjectTitle', 'הזינו את כותרת הפרוייקט')}
        />
        {errors.projectTitle && <span className="error-message">{errors.projectTitle}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="fundName">
            {t('fundNameLabel', 'שם הקרן אליה הוגשה הבקשה')} <span className="required">*</span>
          </label>
          <select
            id="fundName"
            name="fundName"
            value={formData.fundName}
            onChange={handleChange}
            className={errors.fundName ? 'error' : ''}
          >
            <option value="">{t('selectFund', 'בחרו קרן')}</option>
            {fundOptions.map(fund => (
              <option key={fund} value={fund}>{fund}</option>
            ))}
          </select>
          {errors.fundName && <span className="error-message">{errors.fundName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="fundType">
            {t('fundTypeLabel', 'סוג הקרן')}
          </label>
          <select
            id="fundType"
            name="fundType"
            value={formData.fundType}
            onChange={handleChange}
          >
            <option value="">{t('selectFundType', 'בחרו סוג קרן')}</option>
            {fundTypeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="submissionPath">
            {t('submissionPathLabel', 'מסלול ההגשה לקרן')} <span className="required">*</span>
          </label>
          <select
            id="submissionPath"
            name="submissionPath"
            value={formData.submissionPath}
            onChange={handleChange}
            className={errors.submissionPath ? 'error' : ''}
          >
            <option value="">{t('selectPath', 'בחרו מסלול')}</option>
            {submissionPathOptions.map(path => (
              <option key={path} value={path}>{path}</option>
            ))}
          </select>
          {errors.submissionPath && <span className="error-message">{errors.submissionPath}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="submissionType">
            {t('submissionTypeLabel', 'סוג הגשה')}
          </label>
          <select
            id="submissionType"
            name="submissionType"
            value={formData.submissionType}
            onChange={handleChange}
          >
            <option value="">{t('selectSubmissionType', 'בחרו סוג הגשה')}</option>
            {submissionTypeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="researcherRole">
            {t('researcherRoleLabel', 'תפקיד החוקר בהצעת המחקר')} <span className="required">*</span>
          </label>
          <select
            id="researcherRole"
            name="researcherRole"
            value={formData.researcherRole}
            onChange={handleChange}
            className={errors.researcherRole ? 'error' : ''}
          >
            <option value="">{t('selectRole', 'בחרו תפקיד')}</option>
            {researcherRoleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          {errors.researcherRole && <span className="error-message">{errors.researcherRole}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="proposalStage">
            {t('proposalStageLabel', 'שלב ההצעה')} <span className="required">*</span>
          </label>
          <select
            id="proposalStage"
            name="proposalStage"
            value={formData.proposalStage}
            onChange={handleChange}
            className={errors.proposalStage ? 'error' : ''}
          >
            <option value="">{t('selectStage', 'בחרו שלב')}</option>
            {proposalStageOptions.map(stage => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
          {errors.proposalStage && <span className="error-message">{errors.proposalStage}</span>}
        </div>
      </div>
    </div>
  );
};

export default BasicInfoSection;
