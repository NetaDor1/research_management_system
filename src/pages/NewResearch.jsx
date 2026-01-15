import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../services/firebase';
import './Page.css';
import './Research.css';

const NewResearch = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  
  // Options for dropdowns
  const fundOptions = [
    'הקרן הלאומית למדע ISF - Israeli Science Foundation',
    'הקרן הדו-לאומית למדע BSF - Binational Science Foundation',
    'הקרן הגרמנית-ישראלית למחקר ופיתוח GIF - German-Israeli Foundation',
    'האיחוד האירופי Horizon',
    'משרד החדשנות, המדע והטכנולוגיה MOST',
    'משרד הבריאות MOH',
    'המכון הלאומי לבריאות (ארה"ב) - NIH National Institute of Health',
    'הקרן לחקר הסרטן ICRF',
    'הקרן הדו-לאומית למחקר ופיתוח חקלאי BARD',
    'שיתוף פעולה גרמניה-ישראל DIP',
    'הקרן הגרמנית למחקר DFG',
    'HFSP - Human Frontiers Science Project',
    'רשות המים - המדען הראשי',
    'רשות האנרגיה והתשתיות - המדען הראשי',
    'המשרד לאיכות הסביבה - המדען הראשי',
    'משרד החקלאות וההתיישבות הכפרית / מכון וולקני',
    'האגודה למלחמה בסרטן',
    'אלו"ט',
    'קרן "שלם"',
    'Volfswagen Stiftung',
    'Spencer Foundation for Research in Education',
    'קרן קיימת לישראל קק"ל',
    'מו"פ מדבר יהודה וים המלח',
    'המרכז למחקרי סביבה וקיימות',
    'קרן פזי',
    'מכון אלי הורביץ לניהול אסטרטגי',
    'מרכז לדאטה ובינה מלאכותית - אונ\' תל אביב',
    'קרן אחרת'
  ];

  const submissionPathOptions = [
    'לאומי',
    'בינלאומי',
    'שת"פ משרדים ממשלתיים',
    'אחר'
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

  const submissionTypeOptions = [
    'שלב אחד',
    'דו-שלבי',
    'רב שלבי',
    'אחר'
  ];

  const fundTypeOptions = [
    'תחרותי',
    'ממשלתי',
    'עמותה / קהילה',
    'בינלאומי',
    'מרכזי מחקר',
    'תשתיות מחקר'
  ];

  const currencyOptions = [
    { value: 'ILS', label: '₪ (שקל)' },
    { value: 'USD', label: '$ (דולר)' },
    { value: 'EUR', label: '€ (אירו)' }
  ];

  const budgetComponents = [
    'כוח אדם',
    'ציוד קבוע',
    'חומרים וציוד מתכלה',
    'מחשבים',
    'נסיעות לחו"ל',
    'כנסים',
    'פטנטים',
    'שונות',
    'תקורה'
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
    fundType: '',
    submissionPath: '',
    researcherRole: '',
    proposalStage: '',
    submissionType: '',
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
  
  // Refs for date pickers
  const startDatePickerRef = useRef(null);
  const endDatePickerRef = useRef(null);
  const expectedDatePickerRef = useRef(null);

  // Calculate research duration automatically
  useEffect(() => {
    if (formData.researchStartDate && formData.researchEndDate) {
      const startDateISO = convertDateToISO(formData.researchStartDate);
      const endDateISO = convertDateToISO(formData.researchEndDate);
      
      if (startDateISO && endDateISO) {
        const start = new Date(startDateISO);
        const end = new Date(endDateISO);
        
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
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
    }
  }, [formData.researchStartDate, formData.researchEndDate]);

  // Calculate total budget from components
  useEffect(() => {
    const total = Object.values(formData.budgetComponents || {}).reduce((sum, amount) => {
      const numAmount = parseFloat(amount) || 0;
      return sum + numAmount;
    }, 0);
    
    if (total > 0) {
      setFormData(prev => ({
        ...prev,
        totalBudget: total.toString()
      }));
    }
  }, [formData.budgetComponents]);

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
    } else {
      setFormData(prev => ({
        ...prev,
        convertedBudget: ''
      }));
    }
  }, [formData.totalBudget, formData.currency]);

  // Format date from YYYY-MM-DD to dd/mm/yyyy
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    // If already in dd/mm/yyyy format, return as is
    if (dateString.includes('/')) {
      return dateString;
    }
    // Convert from YYYY-MM-DD to dd/mm/yyyy
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  // Convert date from dd/mm/yyyy to YYYY-MM-DD for storage
  const convertDateToISO = (dateString) => {
    if (!dateString) return '';
    // If already in YYYY-MM-DD format, return as is
    if (dateString.includes('-') && dateString.length === 10) {
      return dateString;
    }
    // Convert from dd/mm/yyyy to YYYY-MM-DD
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return dateString;
  };

  // Handle date input with formatting
  const handleDateChange = (name, value) => {
    // Remove non-numeric characters except /
    let cleaned = value.replace(/[^\d/]/g, '');
    
    // Split by / to handle each part separately
    const parts = cleaned.split('/');
    let day = parts[0] || '';
    let month = parts[1] || '';
    let year = parts[2] || '';
    
    // Limit day to 2 digits and validate (01-31)
    if (day.length > 2) {
      day = day.slice(0, 2);
    }
    if (day.length === 2) {
      const dayNum = parseInt(day, 10);
      if (dayNum > 31) {
        day = '31';
      } else if (dayNum < 1) {
        day = '01';
      }
    }
    
    // Limit month to 2 digits and validate (01-12)
    if (month.length > 2) {
      month = month.slice(0, 2);
    }
    if (month.length === 2) {
      const monthNum = parseInt(month, 10);
      if (monthNum > 12) {
        month = '12';
      } else if (monthNum < 1) {
        month = '01';
      }
    }
    
    // Limit year to 4 digits
    if (year.length > 4) {
      year = year.slice(0, 4);
    }
    
    // Reconstruct the date string
    let formatted = day;
    if (month || (cleaned.includes('/') && day.length === 2)) {
      formatted += '/' + month;
    }
    if (year || (cleaned.split('/').length > 2 && month.length === 2)) {
      formatted += '/' + year;
    }
    
    // Auto-add / after day when 2 digits are entered
    if (day.length === 2 && !month && !cleaned.includes('/') && value.length > cleaned.length) {
      formatted = day + '/';
    }
    
    // Auto-add / after month when 2 digits are entered
    if (month.length === 2 && !year && cleaned.split('/').length === 2 && value.length > cleaned.length) {
      formatted = day + '/' + month + '/';
    }

    setFormData(prev => ({
      ...prev,
      [name]: formatted
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle date picker change (from calendar)
  const handleDatePickerChange = (name, value) => {
    if (value) {
      // Convert from YYYY-MM-DD to dd/mm/yyyy
      const parts = value.split('-');
      if (parts.length === 3) {
        const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        setFormData(prev => ({
          ...prev,
          [name]: formatted
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear error
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0] || null
      }));
    } else if (name === 'researchStartDate' || name === 'researchEndDate' || name === 'expectedResponseDate') {
      // Handle date fields with custom formatting
      handleDateChange(name, value);
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
    // Ensure value is a string (for number input)
    const budgetValue = typeof value === 'string' ? value : '';
    
    setFormData(prev => {
      const newBudgetComponents = {
        ...prev.budgetComponents,
        [component]: budgetValue
      };
      
      // Calculate total budget from all components
      const total = Object.values(newBudgetComponents).reduce((sum, amount) => {
        const numAmount = parseFloat(amount) || 0;
        return sum + numAmount;
      }, 0);
      
      return {
        ...prev,
        budgetComponents: newBudgetComponents,
        totalBudget: total > 0 ? total.toString() : ''
      };
    });
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
    // Validate date format dd/mm/yyyy
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    
    if (!formData.researchStartDate) {
      newErrors.researchStartDate = 'תאריך תחילת המחקר חובה';
    } else if (!datePattern.test(formData.researchStartDate)) {
      newErrors.researchStartDate = 'תאריך לא תקין. נא להזין בפורמט dd/mm/yyyy';
    } else {
      const startDateISO = convertDateToISO(formData.researchStartDate);
      const startDate = new Date(startDateISO);
      if (isNaN(startDate.getTime())) {
        newErrors.researchStartDate = 'תאריך לא תקין';
      }
    }
    
    if (!formData.researchEndDate) {
      newErrors.researchEndDate = 'תאריך סיום המחקר חובה';
    } else if (!datePattern.test(formData.researchEndDate)) {
      newErrors.researchEndDate = 'תאריך לא תקין. נא להזין בפורמט dd/mm/yyyy';
    } else {
      const endDateISO = convertDateToISO(formData.researchEndDate);
      const endDate = new Date(endDateISO);
      if (isNaN(endDate.getTime())) {
        newErrors.researchEndDate = 'תאריך לא תקין';
      } else if (formData.researchStartDate) {
        const startDateISO = convertDateToISO(formData.researchStartDate);
        const startDate = new Date(startDateISO);
        if (!isNaN(startDate.getTime()) && endDate <= startDate) {
          newErrors.researchEndDate = 'תאריך סיום חייב להיות אחרי תאריך התחלה';
        }
      }
    }
    // Check if at least one budget component has a value
    const hasBudgetComponents = Object.values(formData.budgetComponents || {}).some(amount => {
      const numAmount = parseFloat(amount) || 0;
      return numAmount > 0;
    });
    
    if (!hasBudgetComponents) {
      newErrors.budgetComponents = 'יש למלא לפחות קטגוריית תקציב אחת';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('יש למלא את כל השדות החובה');
      return;
    }

    try {
      const researcherId = user?.id || 'temp-user-id';
      const researcherName = user?.name || 'חוקר';

      console.log('Starting to save research proposal...');
      console.log('Researcher ID:', researcherId);
      console.log('Researcher Name:', researcherName);

      // Convert dates to Timestamp for Firestore
      const researchStartDateISO = convertDateToISO(formData.researchStartDate);
      const researchEndDateISO = convertDateToISO(formData.researchEndDate);
      const expectedResponseDateISO = convertDateToISO(formData.expectedResponseDate);
      
      const researchStartDate = researchStartDateISO 
        ? Timestamp.fromDate(new Date(researchStartDateISO))
        : null;
      
      const researchEndDate = researchEndDateISO 
        ? Timestamp.fromDate(new Date(researchEndDateISO))
        : null;
      
      const expectedResponseDate = expectedResponseDateISO 
        ? Timestamp.fromDate(new Date(expectedResponseDateISO))
        : null;

      // Prepare research data
      const researchData = {
        // פרטים כלליים
        projectTitle: formData.projectTitle,
        fundName: formData.fundName,
        fundType: formData.fundType || '',
        submissionPath: formData.submissionPath,
        researcherRole: formData.researcherRole,
        proposalStage: formData.proposalStage,
        submissionType: formData.submissionType || '',
        
        // פרטי החוקר
        researcherId: researcherId,
        researcherName: researcherName,
        
        // תקופת המחקר
        researchStartDate: researchStartDate,
        researchEndDate: researchEndDate,
        researchDurationYears: formData.researchDurationYears || '',
        academicYear: formData.academicYear || '',
        
        // תקציב
        totalBudget: formData.totalBudget || '',
        currency: formData.currency || 'ILS',
        convertedBudget: formData.convertedBudget || '',
        budgetComponents: formData.budgetComponents || {},
        
        // שותפים
        partners: formData.partners.filter(p => p.name || p.email || p.institution || p.country) || [],
        
        // מסמכים
        researchProposalFileUrl: '',
        officialDocuments: [],
        requiredDocumentsChecklist: formData.requiredDocumentsChecklist || {},
        
        // חתימה
        digitalSignature: formData.digitalSignature || { signed: false, signer: '', date: null },
        
        // מידע נוסף
        expectedResponseDate: expectedResponseDate,
        notes: formData.notes || '',
        
        // סטטוס
        status: 'pending',
        hasPatent: false,
        
        // תאריכים
        submissionDate: researchStartDate || serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isNew: true
      };

      console.log('Research data prepared:', researchData);

      // Create document in Firestore
      console.log('Creating document in Firestore...');
      const docRef = await addDoc(collection(db, 'researchProposals'), researchData);
      console.log('Document created with ID:', docRef.id);

      // Upload files after document creation
      let proposalFileUrl = '';
      let officialDocsUrls = [];
      
      if (formData.researchProposalFile) {
        try {
          console.log('Uploading proposal file...');
          const fileRef = ref(storage, `researchProposals/${docRef.id}/proposal/${formData.researchProposalFile.name}`);
          await uploadBytes(fileRef, formData.researchProposalFile);
          proposalFileUrl = await getDownloadURL(fileRef);
          console.log('Proposal file uploaded:', proposalFileUrl);
        } catch (fileError) {
          console.error('Error uploading proposal file:', fileError);
          // Continue even if file upload fails
        }
      }

      if (formData.officialDocuments && formData.officialDocuments.length > 0) {
        try {
          console.log('Uploading official documents...');
          for (let idx = 0; idx < formData.officialDocuments.length; idx++) {
            const file = formData.officialDocuments[idx];
            const fileRef = ref(storage, `researchProposals/${docRef.id}/official/${Date.now()}-${idx}-${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            officialDocsUrls.push(url);
          }
          console.log('Official documents uploaded:', officialDocsUrls.length);
        } catch (fileError) {
          console.error('Error uploading official documents:', fileError);
          // Continue even if file upload fails
        }
      }

      // Update document with file URLs if any files were uploaded
      if (proposalFileUrl || officialDocsUrls.length > 0) {
        try {
          console.log('Updating document with file URLs...');
          await updateDoc(doc(db, 'researchProposals', docRef.id), {
            researchProposalFileUrl: proposalFileUrl || null,
            officialDocuments: officialDocsUrls,
            updatedAt: serverTimestamp(),
          });
          console.log('Document updated with file URLs');
        } catch (updateError) {
          console.error('Error updating document with file URLs:', updateError);
          // Continue even if update fails
        }
      }

      console.log('Research proposal saved successfully!');
      alert('הצעת המחקר נשלחה בהצלחה!');
      navigate(userRole === 'RESEARCHER' ? '/' : '/research');
    } catch (error) {
      console.error('Error saving research:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'שגיאה בשמירת המחקר. ';
      
      if (error.code === 'permission-denied') {
        errorMessage += 'אין הרשאה לשמור. בדקי את ה-Security Rules ב-Firebase.';
      } else if (error.code === 'unavailable') {
        errorMessage += 'Firebase לא זמין כרגע. נסי שוב מאוחר יותר.';
      } else {
        errorMessage += `פרטים: ${error.message || 'שגיאה לא ידועה'}`;
      }
      
      alert(errorMessage);
    }
  };

  const handleCancel = () => {
    navigate(userRole === 'RESEARCHER' ? '/' : '/research');
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
            <span class="info-label">סוג הקרן:</span>
            <span class="info-value">${formData.fundType || '<span class="empty-field">לא צוין</span>'}</span>
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
          <div class="info-row">
            <span class="info-label">סוג הגשה:</span>
            <span class="info-value">${formData.submissionType || '<span class="empty-field">לא צוין</span>'}</span>
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

          {/* Research Dates */}
          <div className="form-section">
            <h2>תקופת המחקר</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="researchStartDate">
                  תאריך לועזי של תחילת המחקר (dd/mm/yyyy) <span className="required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
                  <input
                    type="text"
                    id="researchStartDate"
                    name="researchStartDate"
                    value={formatDateForDisplay(formData.researchStartDate)}
                    onChange={handleChange}
                    className={errors.researchStartDate ? 'error' : ''}
                    placeholder="dd/mm/yyyy"
                    maxLength="10"
                    style={{ flex: 1 }}
                  />
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <input
                      type="date"
                      ref={startDatePickerRef}
                      value={convertDateToISO(formData.researchStartDate) || ''}
                      onChange={(e) => handleDatePickerChange('researchStartDate', e.target.value)}
                      style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 2
                      }}
                      title="בחר תאריך מלוח שנה"
                    />
                    <div
                      style={{
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8f9fa',
                        border: '2px solid #e9ecef',
                        borderRadius: '8px',
                        minWidth: '40px',
                        height: '40px',
                        transition: 'all 0.2s',
                        margin: 0,
                        pointerEvents: 'none'
                      }}
                      onMouseEnter={(e) => {
                        const parent = e.target.parentElement;
                        if (parent) {
                          parent.style.background = '#e9ecef';
                          parent.style.borderColor = '#667eea';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const parent = e.target.parentElement;
                        if (parent) {
                          parent.style.background = '#f8f9fa';
                          parent.style.borderColor = '#e9ecef';
                        }
                      }}
                    >
                      📅
                    </div>
                  </div>
                </div>
                {errors.researchStartDate && <span className="error-message">{errors.researchStartDate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="researchEndDate">
                  תאריך לועזי של סוף המחקר (dd/mm/yyyy) <span className="required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
                  <input
                    type="text"
                    id="researchEndDate"
                    name="researchEndDate"
                    value={formatDateForDisplay(formData.researchEndDate)}
                    onChange={handleChange}
                    className={errors.researchEndDate ? 'error' : ''}
                    placeholder="dd/mm/yyyy"
                    maxLength="10"
                    style={{ flex: 1 }}
                  />
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <input
                      type="date"
                      ref={endDatePickerRef}
                      value={convertDateToISO(formData.researchEndDate) || ''}
                      onChange={(e) => handleDatePickerChange('researchEndDate', e.target.value)}
                      style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 2
                      }}
                      title="בחר תאריך מלוח שנה"
                    />
                    <div
                      style={{
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8f9fa',
                        border: '2px solid #e9ecef',
                        borderRadius: '8px',
                        minWidth: '40px',
                        height: '40px',
                        transition: 'all 0.2s',
                        margin: 0,
                        pointerEvents: 'none'
                      }}
                      onMouseEnter={(e) => {
                        const parent = e.target.parentElement;
                        if (parent) {
                          parent.style.background = '#e9ecef';
                          parent.style.borderColor = '#667eea';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const parent = e.target.parentElement;
                        if (parent) {
                          parent.style.background = '#f8f9fa';
                          parent.style.borderColor = '#e9ecef';
                        }
                      }}
                    >
                      📅
                    </div>
                  </div>
                </div>
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
            
            <div className="form-group">
              <label>רכיבי התקציב <span className="required">*</span></label>
              <p className="form-subtitle" style={{ marginBottom: '15px', color: '#6c757d', fontSize: '14px' }}>
                הזינו את הסכום המבוקש לכל קטגוריה. הסכום הכולל יחושב אוטומטית.
              </p>
              <div className="budget-components-grid">
                {budgetComponents.map(component => (
                  <div key={component} className="budget-component-item">
                    <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      {component}
                    </label>
                    <input
                      type="number"
                      placeholder="הזינו סכום"
                      value={formData.budgetComponents[component] || ''}
                      onChange={(e) => handleBudgetComponentChange(component, e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
              </div>
              {errors.budgetComponents && (
                <span className="error-message" style={{ display: 'block', marginTop: '10px' }}>
                  {errors.budgetComponents}
                </span>
              )}
            </div>

            <div className="form-row" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e9ecef' }}>
              <div className="form-group">
                <label htmlFor="totalBudget">
                  סה"כ התקציב המבוקש (חישוב אוטומטי)
                </label>
                <input
                  type="text"
                  id="totalBudget"
                  name="totalBudget"
                  value={formData.totalBudget ? Number(formData.totalBudget).toLocaleString('he-IL') : ''}
                  readOnly
                  className="readonly-field"
                  placeholder="יחושב אוטומטית מכל הקטגוריות"
                  style={{ fontWeight: '600', fontSize: '18px', color: '#667eea' }}
                />
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
                  value={formData.convertedBudget ? Number(formData.convertedBudget).toLocaleString('he-IL') : ''}
                  readOnly
                  className="readonly-field"
                  placeholder="יחושב אוטומטית"
                />
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
                <input
                  type="text"
                  id="expectedResponseDate"
                  name="expectedResponseDate"
                  value={formatDateForDisplay(formData.expectedResponseDate)}
                  onChange={handleChange}
                  placeholder="dd/mm/yyyy"
                  maxLength="10"
                  style={{ flex: 1 }}
                />
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input
                    type="date"
                    ref={expectedDatePickerRef}
                    value={convertDateToISO(formData.expectedResponseDate) || ''}
                    onChange={(e) => handleDatePickerChange('expectedResponseDate', e.target.value)}
                    style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                    title="בחר תאריך מלוח שנה"
                  />
                  <div
                    style={{
                      cursor: 'pointer',
                      fontSize: '20px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f8f9fa',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      minWidth: '40px',
                      height: '40px',
                      transition: 'all 0.2s',
                      margin: 0,
                      pointerEvents: 'none'
                    }}
                    onMouseEnter={(e) => {
                      const parent = e.target.parentElement;
                      if (parent) {
                        parent.style.background = '#e9ecef';
                        parent.style.borderColor = '#667eea';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const parent = e.target.parentElement;
                      if (parent) {
                        parent.style.background = '#f8f9fa';
                        parent.style.borderColor = '#e9ecef';
                      }
                    }}
                  >
                    📅
                  </div>
                </div>
              </div>
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
