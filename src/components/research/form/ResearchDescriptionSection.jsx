import React from 'react';

const ResearchDescriptionSection = ({ formData, handleChange }) => {
  return (
    <div className="form-section">
      <h2>תיאור המחקר</h2>
      
      <div className="form-group">
        <label htmlFor="abstract">
          Abstract - תקציר
        </label>
        <textarea
          id="abstract"
          name="abstract"
          value={formData.abstract}
          onChange={handleChange}
          placeholder="הזינו תקציר המחקר"
          rows="6"
          style={{ width: '100%', minHeight: '120px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="scientificBackground">
          Scientific background and state of the art - רקע מדעי ומצב טכנולוגי חדש
        </label>
        <textarea
          id="scientificBackground"
          name="scientificBackground"
          value={formData.scientificBackground}
          onChange={handleChange}
          placeholder="הזינו רקע מדעי ומצב טכנולוגי חדש"
          rows="8"
          style={{ width: '100%', minHeight: '160px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="researchObjectives">
          מטרות מחקר ומטרות ספציפיות - Research objectives and specific aims
        </label>
        <textarea
          id="researchObjectives"
          name="researchObjectives"
          value={formData.researchObjectives}
          onChange={handleChange}
          placeholder="הזינו מטרות מחקר ומטרות ספציפיות"
          rows="8"
          style={{ width: '100%', minHeight: '160px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="detailedDescription">
          Detailed description of the proposed research - תיאור מפורט של המחקר המוצע
        </label>
        <textarea
          id="detailedDescription"
          name="detailedDescription"
          value={formData.detailedDescription}
          onChange={handleChange}
          placeholder="הזינו תיאור מפורט של המחקר המוצע"
          rows="10"
          style={{ width: '100%', minHeight: '200px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="significanceInnovation">
          Significance, innovation and potential benefits of the proposed research - משמעות, חדשנות ותועלת פוטנציאלית של המחקר המוצע
        </label>
        <textarea
          id="significanceInnovation"
          name="significanceInnovation"
          value={formData.significanceInnovation}
          onChange={handleChange}
          placeholder="הזינו משמעות, חדשנות ותועלת פוטנציאלית של המחקר המוצע"
          rows="8"
          style={{ width: '100%', minHeight: '160px' }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="applicability">
          Applicability - ישימות
        </label>
        <textarea
          id="applicability"
          name="applicability"
          value={formData.applicability}
          onChange={handleChange}
          placeholder="הזינו ישימות המחקר"
          rows="6"
          style={{ width: '100%', minHeight: '120px' }}
        />
      </div>
    </div>
  );
};

export default ResearchDescriptionSection;
