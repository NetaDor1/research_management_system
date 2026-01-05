import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Page.css';
import './Research.css';

const NewResearch = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Options for dropdowns
  const fundOptions = [
    'קרן המדען הראשי',
    'קרן ISF',
    'קרן GIF',
    'קרן BSF',
    'קרן ERC',
    'קרן Horizon Europe',
    'קרן NIH',
    'קרן NSF',
    'קרן DFG',
    'קרן ANR',
    'קרן UKRI',
    'קרן JSPS',
    'קרן NSERC',
    'קרן ARC',
    'קרן אחרת'
  ];

  const submissionPathOptions = [
    'מסלול רגיל',
    'מסלול מהיר',
    'מסלול בינלאומי',
    'מסלול מיוחד'
  ];

  const researcherRoleOptions = [
    'חוקר ראשי',
    'חוקר משנה',
    'שותף',
    'יועץ'
  ];

  const proposalStageOptions = [
    'קדם הצעה',
    'הצעה מלאה'
  ];

  const currencyOptions = [
    { value: 'ILS', label: '₪ (שקל)' },
    { value: 'USD', label: '$ (דולר)' },
    { value: 'EUR', label: '€ (אירו)' }
  ];

  const budgetComponents = [
    'כ"א (כוח אדם)',
    'ציוד',
    'נסיעות',
    'פרסומים',
    'תקורה',
    'אחר'
  ];

  const requiredDocuments = [
    'קורות חיים',
    'תקציר המחקר',
    'מכתב המלצה',
    'אישור אתיקה',
    'תקציב מפורט',
    'מסמכי שותפים',
    'אישור מוסדי'
  ];

  // Helper function to convert Gregorian date to Hebrew academic year
  const getHebrewAcademicYear = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    
    // Academic year starts in October (month 10)
    let academicYear = year;
    if (month >= 10) {
      academicYear = year + 1;
    }
    
    // Convert to Hebrew year (simplified - actual conversion is more complex)
    const hebrewYear = academicYear - 3760;
    const hebrewLetters = ['תשפ"א', 'תשפ"ב', 'תשפ"ג', 'תשפ"ד', 'תשפ"ה', 'תשפ"ו', 'תשפ"ז', 'תשפ"ח', 'תשפ"ט', 'תש"צ'];
    const index = (hebrewYear - 5781) % 10;
    
    if (index >= 0 && index < hebrewLetters.length) {
      return hebrewLetters[index];
    }
    
    // Fallback calculation
    const baseYear = 5781; // תשפ"א
    const diff = hebrewYear - baseYear;
    const letterIndex = diff % 10;
    return hebrewLetters[letterIndex] || `תשפ"${String.fromCharCode(1488 + letterIndex)}`;
  };

  const [formData, setFormData] = useState({
    projectTitle: '',
    fundName: '',
    submissionPath: '',
    researcherRole: '',
    proposalStage: '',
    researchStartDate: '',
    researchEndDate: '',
    researchDurationYears: '',
    academicYear: '',
    totalBudget: '',
    currency: 'ILS',
    convertedBudget: '',
    budgetComponents: {},
    partners: [{ name: '', email: '', institution: '', country: '' }],
    researchProposalFile: null,
    requiredDocumentsChecklist: {},
    officialDocuments: [],
    digitalSignature: { signed: false, date: '', signer: '' },
    expectedResponseDate: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Calculate research duration automatically
  useEffect(() => {
    if (formData.researchStartDate && formData.researchEndDate) {
      const start = new Date(formData.researchStartDate);
      const end = new Date(formData.researchEndDate);
      
      if (end > start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffYears = (diffDays / 365).toFixed(2);
        
        setFormData(prev => ({
          ...prev,
          researchDurationYears: diffYears
        }));

        // Calculate academic year
        const academicYear = getHebrewAcademicYear(start);
        setFormData(prev => ({
          ...prev,
          academicYear: academicYear
        }));
      }
    }
  }, [formData.researchStartDate, formData.researchEndDate]);

  // Calculate converted budget
  useEffect(() => {
    if (formData.totalBudget && formData.currency) {
      // Simplified conversion rates (should be fetched from API in production)
      const rates = {
        'ILS': 1,
        'USD': 3.7,
        'EUR': 4.0
      };
      
      const rate = rates[formData.currency] || 1;
      const converted = (parseFloat(formData.totalBudget) * rate).toFixed(0);
      
      setFormData(prev => ({
        ...prev,
        convertedBudget: converted
      }));
    }
  }, [formData.totalBudget, formData.currency]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0] || null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBudgetComponentChange = (component, value) => {
    setFormData(prev => ({
      ...prev,
      budgetComponents: {
        ...prev.budgetComponents,
        [component]: value
      }
    }));
  };

  const handleDocumentChecklistChange = (document, checked) => {
    setFormData(prev => ({
      ...prev,
      requiredDocumentsChecklist: {
        ...prev.requiredDocumentsChecklist,
        [document]: checked
      }
    }));
  };

  const handlePartnerChange = (index, field, value) => {
    const updatedPartners = [...formData.partners];
    updatedPartners[index][field] = value;
    setFormData(prev => ({
      ...prev,
      partners: updatedPartners
    }));
  };

  const addPartner = () => {
    setFormData(prev => ({
      ...prev,
      partners: [...prev.partners, { name: '', email: '', institution: '', country: '' }]
    }));
  };

  const removePartner = (index) => {
    setFormData(prev => ({
      ...prev,
      partners: prev.partners.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    if (type === 'official') {
      setFormData(prev => ({
        ...prev,
        officialDocuments: [...prev.officialDocuments, ...files]
      }));
    }
  };

  const handleDigitalSignature = () => {
    setFormData(prev => ({
      ...prev,
      digitalSignature: {
        signed: true,
        date: new Date().toISOString().split('T')[0],
        signer: user?.name || 'חתימה דיגיטלית'
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectTitle.trim()) {
      newErrors.projectTitle = 'כותרת הפרוייקט חובה';
    }
    if (!formData.fundName) {
      newErrors.fundName = 'שם הקרן חובה';
    }
    if (!formData.submissionPath) {
      newErrors.submissionPath = 'מסלול ההגשה חובה';
    }
    if (!formData.researcherRole) {
      newErrors.researcherRole = 'תפקיד החוקר חובה';
    }
    if (!formData.proposalStage) {
      newErrors.proposalStage = 'שלב ההצעה חובה';
    }
    if (!formData.researchStartDate) {
      newErrors.researchStartDate = 'תאריך תחילת המחקר חובה';
    }
    if (!formData.researchEndDate) {
      newErrors.researchEndDate = 'תאריך סיום המחקר חובה';
    }
    if (!formData.totalBudget || formData.totalBudget.length > 7) {
      newErrors.totalBudget = 'תקציב חובה (עד 7 ספרות)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Load existing research data
      let existingResearch = [];
      try {
        const saved = localStorage.getItem('researchData');
        if (saved) {
          existingResearch = JSON.parse(saved);
        } else {
          // Use initial mock data if nothing saved
          existingResearch = [
            { id: 1, title: 'מחקר 1', researcher: 'נטע דור', status: 'pending', hasPatent: false, submissionDate: '2024-01-15', isNew: false },
            { id: 2, title: 'מחקר 2', researcher: 'טליה אליהו', status: 'awarded', hasPatent: true, submissionDate: '2024-02-20', isNew: false },
            { id: 3, title: 'מחקר 3', researcher: 'דוד כהן', status: 'awarded', hasPatent: false, submissionDate: '2024-03-10', isNew: false },
            { id: 4, title: 'מחקר 4', researcher: 'שרה לוי', status: 'awarded', hasPatent: true, submissionDate: '2024-04-05', isNew: false },
            { id: 5, title: 'מחקר 5', researcher: 'יוסי ישראלי', status: 'pending', hasPatent: false, submissionDate: '2024-05-12', isNew: true },
            { id: 6, title: 'מחקר 6', researcher: 'מיכל רוזן', status: 'rejected', hasPatent: false, submissionDate: '2024-06-01', isNew: false },
            { id: 7, title: 'מחקר 7', researcher: 'אבי כהן', status: 'pending', hasPatent: true, submissionDate: '2024-06-15', isNew: false },
            { id: 8, title: 'מחקר 8', researcher: 'רותם שמיר', status: 'pending', hasPatent: false, submissionDate: '2024-07-01', isNew: false },
          ];
        }
      } catch (error) {
        console.error('Error loading research data:', error);
      }

      // Create new research object
      const newId = existingResearch.length > 0 
        ? Math.max(...existingResearch.map(r => r.id)) + 1 
        : 1;
      
      const newResearch = {
        id: newId,
        title: formData.projectTitle,
        researcher: formData.researcher || user?.name || 'לא צוין',
        status: 'pending',
        hasPatent: false,
        submissionDate: formData.researchStartDate || new Date().toISOString().split('T')[0],
        isNew: true,
        // Store full form data for future use
        fullData: formData
      };

      // Add new research to the list
      const updatedResearch = [newResearch, ...existingResearch];

      // Save to localStorage
      try {
        localStorage.setItem('researchData', JSON.stringify(updatedResearch));
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('researchAdded'));
        
        console.log('Research saved:', newResearch);
        alert('הצעת המחקר נשלחה בהצלחה!');
        navigate('/research');
      } catch (error) {
        console.error('Error saving research:', error);
        alert('שגיאה בשמירת המחקר. נסו שוב.');
      }
    }
  };

  const handleCancel = () => {
    navigate('/research');
  };

  const handleExportPDF = () => {
    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL');
    };

    // Build partners HTML
    const partnersHTML = formData.partners
      .filter(p => p.name || p.email || p.institution || p.country)
      .map((partner, index) => `
        <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
          <strong>שותף ${index + 1}:</strong><br>
          שם: ${partner.name || 'לא צוין'}<br>
          אימייל: ${partner.email || 'לא צוין'}<br>
          מוסד: ${partner.institution || 'לא צוין'}<br>
          מדינה: ${partner.country || 'לא צוין'}
        </div>
      `).join('');

    // Build budget components HTML
    const budgetComponentsHTML = Object.entries(formData.budgetComponents)
      .filter(([_, value]) => value)
      .map(([component, amount]) => `
        <tr>
          <td>${component}</td>
          <td>${amount ? `${amount} ${formData.currency === 'ILS' ? '₪' : formData.currency === 'USD' ? '$' : '€'}` : '-'}</td>
        </tr>
      `).join('');

    // Build documents checklist HTML
    const documentsHTML = Object.entries(formData.requiredDocumentsChecklist)
      .filter(([_, checked]) => checked)
      .map(([doc]) => `<li>${doc}</li>`)
      .join('');

    // Create printable HTML
    const printHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>הגשה לקרנות מחקר - ${formData.projectTitle || 'טופס'}</title>
        <style>
          @media print {
            @page {
              margin: 2cm;
              size: A4;
            }
            .no-print {
              display: none;
            }
          }
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            direction: rtl;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          h1 {
            color: #667eea;
            font-size: 28px;
            margin-bottom: 10px;
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
          }
          h2 {
            color: #667eea;
            font-size: 20px;
            margin-top: 25px;
            margin-bottom: 15px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 5px;
          }
          .info-section {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .info-row {
            display: flex;
            margin-bottom: 10px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 5px;
          }
          .info-label {
            font-weight: bold;
            min-width: 200px;
            color: #495057;
          }
          .info-value {
            flex: 1;
            color: #212529;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          table th, table td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: right;
          }
          table th {
            background: #667eea;
            color: white;
            font-weight: bold;
          }
          ul {
            margin: 10px 0;
            padding-right: 20px;
          }
          .signature-box {
            background: #d4edda;
            border: 2px solid #28a745;
            padding: 15px;
            margin-top: 20px;
            border-radius: 8px;
          }
          .empty-field {
            color: #999;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <h1>הגשה לקרנות מחקר</h1>
        <p style="text-align: center; color: #6c757d; margin-bottom: 30px;">
          טופס הגשת הצעת מחקר
        </p>

        <div class="info-section">
          <h2>פרטים כלליים</h2>
          <div class="info-row">
            <span class="info-label">כותרת הפרוייקט:</span>
            <span class="info-value">${formData.projectTitle || '<span class="empty-field">לא צוין</span>'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">שם הקרן:</span>
            <span class="info-value">${formData.fundName || '<span class="empty-field">לא צוין</span>'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">מסלול ההגשה:</span>
            <span class="info-value">${formData.submissionPath || '<span class="empty-field">לא צוין</span>'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">תפקיד החוקר:</span>
            <span class="info-value">${formData.researcherRole || '<span class="empty-field">לא צוין</span>'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">שלב ההצעה:</span>
            <span class="info-value">${formData.proposalStage || '<span class="empty-field">לא צוין</span>'}</span>
          </div>
        </div>

        <div class="info-section">
          <h2>תקופת המחקר</h2>
          <div class="info-row">
            <span class="info-label">תאריך תחילת המחקר:</span>
            <span class="info-value">${formatDate(formData.researchStartDate) || '<span class="empty-field">לא צוין</span>'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">תאריך סיום המחקר:</span>
            <span class="info-value">${formatDate(formData.researchEndDate) || '<span class="empty-field">לא צוין</span>'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">משך המחקר בשנים:</span>
            <span class="info-value">${formData.researchDurationYears || '<span class="empty-field">לא חושב</span>'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">שנה אקדמית:</span>
            <span class="info-value">${formData.academicYear || '<span class="empty-field">לא חושב</span>'}</span>
          </div>
        </div>

        <div class="info-section">
          <h2>תקציב</h2>
          <div class="info-row">
            <span class="info-label">סה"כ התקציב המבוקש:</span>
            <span class="info-value">${formData.totalBudget ? `${formData.totalBudget} ${formData.currency === 'ILS' ? '₪' : formData.currency === 'USD' ? '$' : '€'}` : '<span class="empty-field">לא צוין</span>'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">התקציב המתורגם לשקלים:</span>
            <span class="info-value">${formData.convertedBudget ? `${formData.convertedBudget} ₪` : '<span class="empty-field">לא חושב</span>'}</span>
          </div>
          ${budgetComponentsHTML ? `
            <table>
              <thead>
                <tr>
                  <th>רכיב תקציב</th>
                  <th>סכום</th>
                </tr>
              </thead>
              <tbody>
                ${budgetComponentsHTML}
              </tbody>
            </table>
          ` : ''}
        </div>

        ${partnersHTML ? `
          <div class="info-section">
            <h2>שותפים לפרוייקט</h2>
            ${partnersHTML}
          </div>
        ` : ''}

        <div class="info-section">
          <h2>מסמכים</h2>
          <div class="info-row">
            <span class="info-label">מסמך הצעת המחקר:</span>
            <span class="info-value">${formData.researchProposalFile ? formData.researchProposalFile.name : '<span class="empty-field">לא הועלה</span>'}</span>
          </div>
          ${documentsHTML ? `
            <div style="margin-top: 15px;">
              <strong>מסמכים שהוגשו:</strong>
              <ul>
                ${documentsHTML}
              </ul>
            </div>
          ` : ''}
          ${formData.officialDocuments.length > 0 ? `
            <div style="margin-top: 15px;">
              <strong>מסמכים רשמיים:</strong>
              <ul>
                ${formData.officialDocuments.map(doc => `<li>${doc.name}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>

        ${formData.digitalSignature.signed ? `
          <div class="signature-box">
            <h2>חתימה דיגיטלית</h2>
            <div class="info-row">
              <span class="info-label">חתום על ידי:</span>
              <span class="info-value">${formData.digitalSignature.signer}</span>
            </div>
            <div class="info-row">
              <span class="info-label">תאריך חתימה:</span>
              <span class="info-value">${formatDate(formData.digitalSignature.date)}</span>
            </div>
          </div>
        ` : ''}

        ${formData.expectedResponseDate ? `
          <div class="info-section">
            <h2>תאריך משוער לתשובה</h2>
            <div class="info-row">
              <span class="info-value">${formatDate(formData.expectedResponseDate)}</span>
            </div>
          </div>
        ` : ''}

        ${formData.notes ? `
          <div class="info-section">
            <h2>הערות</h2>
            <div style="padding: 15px; background: #f8f9fa; border-radius: 5px; white-space: pre-wrap;">
              ${formData.notes}
            </div>
          </div>
        ` : ''}

        <div style="margin-top: 40px; text-align: center; color: #6c757d; font-size: 12px;">
          נוצר ב-${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL')}
        </div>
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <h1>הגשה לקרנות מחקר</h1>
        <p className="welcome-text">
          מלאו את הפרטים הבאים כדי להגיש הצעת מחקר חדשה
        </p>

        <form onSubmit={handleSubmit} className="research-form">
          {/* Basic Information */}
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

          {/* Research Dates */}
          <div className="form-section">
            <h2>תקופת המחקר</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="researchStartDate">
                  תאריך לועזי של תחילת המחקר (dd/mm/yyyy) <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="researchStartDate"
                  name="researchStartDate"
                  value={formData.researchStartDate}
                  onChange={handleChange}
                  className={errors.researchStartDate ? 'error' : ''}
                />
                {errors.researchStartDate && <span className="error-message">{errors.researchStartDate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="researchEndDate">
                  תאריך לועזי של סוף המחקר (dd/mm/yyyy) <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="researchEndDate"
                  name="researchEndDate"
                  value={formData.researchEndDate}
                  onChange={handleChange}
                  className={errors.researchEndDate ? 'error' : ''}
                />
                {errors.researchEndDate && <span className="error-message">{errors.researchEndDate}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="researchDurationYears">
                  סה"כ תקופת המחקר בשנים (חישוב אוטומטי)
                </label>
                <input
                  type="text"
                  id="researchDurationYears"
                  name="researchDurationYears"
                  value={formData.researchDurationYears}
                  readOnly
                  className="readonly-field"
                  placeholder="יחושב אוטומטית"
                />
              </div>

              <div className="form-group">
                <label htmlFor="academicYear">
                  שנה אקדמית (תרגום אוטומטי)
                </label>
                <input
                  type="text"
                  id="academicYear"
                  name="academicYear"
                  value={formData.academicYear}
                  readOnly
                  className="readonly-field"
                  placeholder="יחושב אוטומטית"
                />
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="form-section">
            <h2>תקציב</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="totalBudget">
                  סה"כ התקציב המבוקש (עד 7 ספרות) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="totalBudget"
                  name="totalBudget"
                  value={formData.totalBudget}
                  onChange={handleChange}
                  className={errors.totalBudget ? 'error' : ''}
                  placeholder="הזינו את הסכום"
                  maxLength="7"
                />
                {errors.totalBudget && <span className="error-message">{errors.totalBudget}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="currency">
                  מטבע התקציב
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  {currencyOptions.map(currency => (
                    <option key={currency.value} value={currency.value}>{currency.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="convertedBudget">
                  התקציב המתורגם לשקלים (חישוב אוטומטי)
                </label>
                <input
                  type="text"
                  id="convertedBudget"
                  name="convertedBudget"
                  value={formData.convertedBudget}
                  readOnly
                  className="readonly-field"
                  placeholder="יחושב אוטומטית"
                />
              </div>
            </div>

            <div className="form-group">
              <label>רכיבי התקציב</label>
              <div className="budget-components-grid">
                {budgetComponents.map(component => (
                  <div key={component} className="budget-component-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.budgetComponents[component] || false}
                        onChange={(e) => handleBudgetComponentChange(component, e.target.checked)}
                      />
                      {component}
                    </label>
                    {formData.budgetComponents[component] && (
                      <input
                        type="number"
                        placeholder="סכום"
                        onChange={(e) => handleBudgetComponentChange(component, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Partners */}
          <div className="form-section">
            <h2>שותפים לפרוייקט</h2>
            
            {formData.partners.map((partner, index) => (
              <div key={index} className="partner-card">
                <div className="partner-header">
                  <h3>שותף {index + 1}</h3>
                  {formData.partners.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removePartner(index)}
                    >
                      הסר
                    </button>
                  )}
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>שם השותף</label>
                    <input
                      type="text"
                      value={partner.name}
                      onChange={(e) => handlePartnerChange(index, 'name', e.target.value)}
                      placeholder="שם השותף"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>אימייל של השותף</label>
                    <input
                      type="email"
                      value={partner.email}
                      onChange={(e) => handlePartnerChange(index, 'email', e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>המוסד של השותף</label>
                    <input
                      type="text"
                      value={partner.institution}
                      onChange={(e) => handlePartnerChange(index, 'institution', e.target.value)}
                      placeholder="שם המוסד"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>מדינה שבה השותף נמצא</label>
                    <input
                      type="text"
                      value={partner.country}
                      onChange={(e) => handlePartnerChange(index, 'country', e.target.value)}
                      placeholder="שם המדינה"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              className="btn-add-partner"
              onClick={addPartner}
            >
              + הוסף שותף
            </button>
          </div>

          {/* Documents */}
          <div className="form-section">
            <h2>מסמכים</h2>
            
            <div className="form-group">
              <label htmlFor="researchProposalFile">
                מסמך הצעת המחקר שהוגשה
              </label>
              <input
                type="file"
                id="researchProposalFile"
                name="researchProposalFile"
                onChange={handleChange}
                accept=".pdf,.doc,.docx"
              />
              {formData.researchProposalFile && (
                <span className="file-name">{formData.researchProposalFile.name}</span>
              )}
            </div>

            <div className="form-group">
              <label>רשימת צ'קליסט של מסמכים להגשה מטעם המוסד</label>
              <div className="checklist-grid">
                {requiredDocuments.map(doc => (
                  <label key={doc} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.requiredDocumentsChecklist[doc] || false}
                      onChange={(e) => handleDocumentChecklistChange(doc, e.target.checked)}
                    />
                    {doc}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="officialDocuments">
                מסמכים רשמיים ואישורים
              </label>
              <input
                type="file"
                id="officialDocuments"
                multiple
                onChange={(e) => handleFileUpload(e, 'official')}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {formData.officialDocuments.length > 0 && (
                <div className="uploaded-files">
                  {formData.officialDocuments.map((file, index) => (
                    <span key={index} className="file-name">{file.name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Digital Signature */}
          <div className="form-section">
            <h2>חתימה דיגיטלית</h2>
            
            <div className="form-group">
              <label>חתימת מורשי חתימה מוסדיים</label>
              {!formData.digitalSignature.signed ? (
                <button
                  type="button"
                  className="btn-signature"
                  onClick={handleDigitalSignature}
                >
                  חתימה דיגיטלית
                </button>
              ) : (
                <div className="signature-info">
                  <p>✓ חתום על ידי: {formData.digitalSignature.signer}</p>
                  <p>תאריך חתימה: {formData.digitalSignature.date}</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="form-section">
            <h2>מידע נוסף</h2>
            
            <div className="form-group">
              <label htmlFor="expectedResponseDate">
                תאריך משוער לקבלת תשובות קבלה / דחיה מהקרנות החיצוניות
              </label>
              <input
                type="date"
                id="expectedResponseDate"
                name="expectedResponseDate"
                value={formData.expectedResponseDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">
                הערות (כתיבה חופשית)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="הערות נוספות"
                rows="6"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel}>
              ביטול
            </button>
            <button type="button" className="btn-export-pdf" onClick={handleExportPDF}>
              ייצוא PDF
            </button>
            <button type="submit" className="btn-submit">
              הגשת הצעה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewResearch;
