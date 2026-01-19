import React from 'react';

const BasicInfoSection = ({ formData, errors, handleChange, fundOptions, fundTypeOptions, submissionPathOptions, submissionTypeOptions, researcherRoleOptions, proposalStageOptions }) => {
  return (
    <div className="form-section">
      <h2>פרטים כלליים</h2>
      
      <div className="form-group">
        <label htmlFor="projectTitle">
          כותרת הפרוייקט שהוגש לקרן חיצונית <span className="required">*</span>
        </label>
        <input
          type="text"
          id="projectTitle"
          name="projectTitle"
          value={formData.projectTitle}
          onChange={handleChange}
          className={errors.projectTitle ? 'error' : ''}
          placeholder="הזינו את כותרת הפרוייקט"
        />
        {errors.projectTitle && <span className="error-message">{errors.projectTitle}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="fundName">
            שם הקרן אליה הוגשה הבקשה <span className="required">*</span>
          </label>
          <select
            id="fundName"
            name="fundName"
            value={formData.fundName}
            onChange={handleChange}
            className={errors.fundName ? 'error' : ''}
          >
            <option value="">בחרו קרן</option>
            {fundOptions.map(fund => (
              <option key={fund} value={fund}>{fund}</option>
            ))}
          </select>
          {errors.fundName && <span className="error-message">{errors.fundName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="fundType">
            סוג הקרן
          </label>
          <select
            id="fundType"
            name="fundType"
            value={formData.fundType}
            onChange={handleChange}
          >
            <option value="">בחרו סוג קרן</option>
            {fundTypeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="submissionPath">
            מסלול ההגשה לקרן <span className="required">*</span>
          </label>
          <select
            id="submissionPath"
            name="submissionPath"
            value={formData.submissionPath}
            onChange={handleChange}
            className={errors.submissionPath ? 'error' : ''}
          >
            <option value="">בחרו מסלול</option>
            {submissionPathOptions.map(path => (
              <option key={path} value={path}>{path}</option>
            ))}
          </select>
          {errors.submissionPath && <span className="error-message">{errors.submissionPath}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="submissionType">
            סוג הגשה
          </label>
          <select
            id="submissionType"
            name="submissionType"
            value={formData.submissionType}
            onChange={handleChange}
          >
            <option value="">בחרו סוג הגשה</option>
            {submissionTypeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="researcherRole">
            תפקיד החוקר בהצעת המחקר <span className="required">*</span>
          </label>
          <select
            id="researcherRole"
            name="researcherRole"
            value={formData.researcherRole}
            onChange={handleChange}
            className={errors.researcherRole ? 'error' : ''}
          >
            <option value="">בחרו תפקיד</option>
            {researcherRoleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          {errors.researcherRole && <span className="error-message">{errors.researcherRole}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="proposalStage">
            שלב ההצעה <span className="required">*</span>
          </label>
          <select
            id="proposalStage"
            name="proposalStage"
            value={formData.proposalStage}
            onChange={handleChange}
            className={errors.proposalStage ? 'error' : ''}
          >
            <option value="">בחרו שלב</option>
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
