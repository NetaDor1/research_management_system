import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, Timestamp, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, storage } from '../services/firebase';
import './Page.css';
import './Research.css';

const NewPatent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  const editId = searchParams.get('edit');

  // Options for dropdowns
  const institutionPercentageOptions = [
    '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%'
  ];

  const commercializationUnitOptions = [
    'יחידת מסחור 1',
    'יחידת מסחור 2',
    'יחידת מסחור 3',
    'יחידת מסחור 4',
    'יחידת מסחור 5',
    'יחידת מסחור 6',
    'יחידת מסחור 7',
    'יחידת מסחור 8',
    'יחידת מסחור 9',
    'יחידת מסחור 10'
  ];

  const submissionPathOptions = [
    'מסלול רגיל',
    'מסלול מהיר',
    'מסלול בינלאומי',
    'מסלול מיוחד'
  ];

  const researcherRoleOptions = [
    'חוקר ראשי',
    'חוקר משנה'
  ];

  const patentStatusOptions = [
    { value: 'in-process', label: 'בהליך' },
    { value: 'registered', label: 'רשום' },
    { value: 'approved', label: 'אושר' }
  ];

  const patentStageOptions = [
    { value: 'stage1', label: 'שלב 1: הגשת בקשה' },
    { value: 'stage2', label: 'שלב 2: בדיקה ראשונית' },
    { value: 'stage3', label: 'שלב 3: בחינה' },
    { value: 'stage4', label: 'שלב 4: אישור' },
    { value: 'stage5', label: 'שלב 5: רישום' }
  ];

  const currencyOptions = [
    { value: 'ILS', label: '₪ (שקל)' },
    { value: 'USD', label: '$ (דולר)' },
    { value: 'EUR', label: '€ (אירו)' }
  ];

  const requiredDocuments = [
    'מסמך הבקשה לפטנט',
    'אישור מוסדי',
    'הסכם שותפים',
    'תקציב מפורט',
    'מסמכי רישום',
    'אישורי תשלום'
  ];

  // Date fields for patent timeline (8 dates)
  const dateFields = [
    { key: 'submissionDate', label: 'תאריך הגשת הבקשה לפטנט' },
    { key: 'initialReviewDate', label: 'תאריך בדיקה ראשונית' },
    { key: 'examinationDate', label: 'תאריך בחינה' },
    { key: 'approvalDate', label: 'תאריך אישור' },
    { key: 'registrationDate', label: 'תאריך רישום' },
    { key: 'publicationDate', label: 'תאריך פרסום' },
    { key: 'renewalDate', label: 'תאריך חידוש' },
    { key: 'expiryDate', label: 'תאריך תפוגה' }
  ];

  const [formData, setFormData] = useState({
    projectTitle: '',
    researchProposalId: '',
    institutionPercentage: '',
    partners: [{ name: '', email: '', institution: '', percentage: '' }],
    commercializationUnit: '',
    commercializationContact1: '',
    commercializationContact2: '',
    commercializationEmail1: '',
    commercializationEmail2: '',
    submissionPath: '',
    researcherRole: '',
    patentStatus: 'in-process',
    patentStage: '',
    dates: {
      submissionDate: '',
      initialReviewDate: '',
      examinationDate: '',
      approvalDate: '',
      registrationDate: '',
      publicationDate: '',
      renewalDate: '',
      expiryDate: ''
    },
    totalBudget: '',
    currency: 'ILS',
    convertedBudget: '',
    stageBudgets: {},
    patentApplicationFile: null,
    requiredDocumentsChecklist: {},
    officialDocuments: [],
    digitalSignature: { signed: false, date: '', signer: '' },
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [researchOptions, setResearchOptions] = useState([]);
  const [researchLoading, setResearchLoading] = useState(true);
  const [researchLoadError, setResearchLoadError] = useState('');
  const isEdit = Boolean(editId);

  // Calculate converted budget based on currency
  useEffect(() => {
    if (formData.totalBudget && formData.currency) {
      const budget = parseFloat(formData.totalBudget) || 0;
      let converted = budget;
      
      // Simple conversion rates (should be fetched from API in production)
      if (formData.currency === 'USD') {
        converted = budget * 3.5; // ILS to USD
      } else if (formData.currency === 'EUR') {
        converted = budget * 3.8; // ILS to EUR
      }
      
      setFormData(prev => ({
        ...prev,
        convertedBudget: converted.toFixed(2)
      }));
    }
  }, [formData.totalBudget, formData.currency]);

  useEffect(() => {
    const fetchResearchOptions = async () => {
      if (!db) {
        setResearchOptions([]);
        setResearchLoading(false);
        return;
      }

      setResearchLoading(true);
      setResearchLoadError('');
      try {
        const researchRef = collection(db, 'researchProposals');
        let researchSnapshot;

        if (userRole === 'ADMIN') {
          researchSnapshot = await getDocs(researchRef);
        } else if (user?.id) {
          const q = query(researchRef, where('researcherId', '==', user.id));
          researchSnapshot = await getDocs(q);
        } else {
          setResearchOptions([]);
          setResearchLoading(false);
          return;
        }

        const options = researchSnapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            id: docItem.id,
            title: data.projectTitle || data.title || 'ללא כותרת',
            researcherName: data.researcherName || data.researcher || 'חוקר'
          };
        });

        setResearchOptions(options);
      } catch (err) {
        console.error('Error loading research options:', err);
        setResearchLoadError('שגיאה בטעינת רשימת מחקרים');
        setResearchOptions([]);
      } finally {
        setResearchLoading(false);
      }
    };

    fetchResearchOptions();
  }, [userRole, user?.id]);

  // Load existing patent data for edit mode
  useEffect(() => {
    const loadExistingPatent = async () => {
      if (!editId || !db) return;

      try {
        const docRef = doc(db, 'patents', editId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          console.warn('Patent to edit not found:', editId);
          return;
        }

        const data = snap.data();

        // Convert dates (Firestore Timestamp or string) to YYYY-MM-DD
        const convertToInputDate = (value) => {
          if (!value) return '';
          try {
            let d;
            if (value && typeof value.toDate === 'function') {
              d = value.toDate();
            } else if (value && value.seconds) {
              d = new Date(value.seconds * 1000);
            } else if (typeof value === 'string') {
              // If already YYYY-MM-DD
              if (value.length === 10 && value.includes('-')) return value;
              d = new Date(value);
            } else {
              return '';
            }
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          } catch {
            return '';
          }
        };

        const loadedDates = {};
        dateFields.forEach(({ key }) => {
          loadedDates[key] = convertToInputDate(data[key]);
        });

        setFormData(prev => ({
          ...prev,
          projectTitle: data.projectTitle || data.title || '',
          researchProposalId: data.researchProposalId || '',
          institutionPercentage: data.institutionPercentage || '',
          partners: (data.partners && data.partners.length > 0)
            ? data.partners
            : [{ name: '', email: '', institution: '', percentage: '' }],
          commercializationUnit: data.commercializationUnit || '',
          commercializationContact1: data.commercializationContact1 || '',
          commercializationContact2: data.commercializationContact2 || '',
          commercializationEmail1: data.commercializationEmail1 || '',
          commercializationEmail2: data.commercializationEmail2 || '',
          submissionPath: data.submissionPath || '',
          researcherRole: data.researcherRole || '',
          patentStatus: data.status || data.patentStatus || 'in-process',
          patentStage: data.patentStage || '',
          dates: {
            ...prev.dates,
            ...loadedDates
          },
          totalBudget: data.totalBudget || '',
          currency: data.currency || 'ILS',
          convertedBudget: data.convertedBudget || '',
          stageBudgets: data.stageBudgets || {},
          requiredDocumentsChecklist: data.requiredDocumentsChecklist || {},
          digitalSignature: data.digitalSignature || { signed: false, date: '', signer: '' },
          notes: data.notes || ''
        }));
      } catch (err) {
        console.error('Error loading patent for edit:', err);
      }
    };

    loadExistingPatent();
  }, [editId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      dates: {
        ...prev.dates,
        [field]: value
      }
    }));
  };

  const handlePartnerChange = (index, field, value) => {
    const newPartners = [...formData.partners];
    newPartners[index][field] = value;
    setFormData(prev => ({
      ...prev,
      partners: newPartners
    }));
  };

  const addPartner = () => {
    setFormData(prev => ({
      ...prev,
      partners: [...prev.partners, { name: '', email: '', institution: '', percentage: '' }]
    }));
  };

  const removePartner = (index) => {
    setFormData(prev => ({
      ...prev,
      partners: prev.partners.filter((_, i) => i !== index)
    }));
  };

  const handleStageBudgetChange = (stage, value) => {
    setFormData(prev => ({
      ...prev,
      stageBudgets: {
        ...prev.stageBudgets,
        [stage]: value
      }
    }));
  };

  const handleFileChange = (field, file) => {
    if (field === 'patentApplicationFile') {
      setFormData(prev => ({ ...prev, patentApplicationFile: file }));
    } else if (field === 'officialDocuments') {
      setFormData(prev => ({
        ...prev,
        officialDocuments: [...(prev.officialDocuments || []), file]
      }));
    }
  };

  const removeOfficialDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      officialDocuments: prev.officialDocuments.filter((_, i) => i !== index)
    }));
  };

  const handleChecklistChange = (document, checked) => {
    setFormData(prev => ({
      ...prev,
      requiredDocumentsChecklist: {
        ...prev.requiredDocumentsChecklist,
        [document]: checked
      }
    }));
  };

  const generateOutlookCalendarLink = (date, title) => {
    if (!date) return '';
    const dateStr = new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const encodedTitle = encodeURIComponent(title || 'תאריך פטנט');
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedTitle}&startdt=${dateStr}&enddt=${dateStr}`;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectTitle.trim()) {
      newErrors.projectTitle = 'כותרת הפרוייקט חובה';
    }
    if (!formData.institutionPercentage) {
      newErrors.institutionPercentage = 'אחוזי המוסד חובה';
    }
    if (!formData.commercializationUnit) {
      newErrors.commercializationUnit = 'יחידת המסחור חובה';
    }
    if (!formData.submissionPath) {
      newErrors.submissionPath = 'מסלול ההגשה חובה';
    }
    if (!formData.researcherRole) {
      newErrors.researcherRole = 'תפקיד החוקר חובה';
    }
    if (!formData.patentStatus) {
      newErrors.patentStatus = 'סטטוס הפטנט חובה';
    }
    if (!formData.patentStage) {
      newErrors.patentStage = 'שלב הפטנט חובה';
    }
    if (!formData.dates.submissionDate) {
      newErrors.submissionDate = 'תאריך הגשת הבקשה חובה';
    }
    if (!formData.totalBudget || formData.totalBudget.length > 7) {
      newErrors.totalBudget = 'תקציב חובה (עד 7 ספרות)';
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

    setIsSubmitting(true);

    try {
      const researcherId = user?.id || 'temp-user-id';
      const researcherName = user?.name || 'חוקר';

      console.log('Starting to save patent...');

      // Convert dates to Timestamp for Firestore
      const datesTimestamps = {};
      Object.keys(formData.dates).forEach(key => {
        if (formData.dates[key]) {
          datesTimestamps[key] = Timestamp.fromDate(new Date(formData.dates[key]));
        }
      });

      // Prepare patent data
      const linkedResearch = formData.researchProposalId
        ? researchOptions.find(option => option.id === formData.researchProposalId)
        : null;

      const patentData = {
        // פרטים כלליים
        title: formData.projectTitle,
        projectTitle: formData.projectTitle,
        researchProposalId: formData.researchProposalId || null,
        researchProposalTitle: linkedResearch?.title || '',
        
        // אחוזי המוסד
        institutionPercentage: formData.institutionPercentage,
        
        // שותפים
        partners: formData.partners.filter(p => p.name || p.email || p.institution || p.percentage),
        
        // יחידת מסחור
        commercializationUnit: formData.commercializationUnit,
        commercializationContact1: formData.commercializationContact1,
        commercializationContact2: formData.commercializationContact2,
        commercializationEmail1: formData.commercializationEmail1,
        commercializationEmail2: formData.commercializationEmail2,
        
        // מסלול ותפקיד
        submissionPath: formData.submissionPath,
        researcherRole: formData.researcherRole,
        
        // סטטוס ושלב
        status: formData.patentStatus,
        patentStage: formData.patentStage,
        
        // תאריכים
        ...datesTimestamps,
        registrationDate: datesTimestamps.registrationDate || datesTimestamps.submissionDate || serverTimestamp(),
        
        // תקציב
        totalBudget: formData.totalBudget || '',
        currency: formData.currency || 'ILS',
        convertedBudget: formData.convertedBudget || '',
        stageBudgets: formData.stageBudgets || {},
        
        // מסמכים (הקישורים עצמם יעודכנו לאחר העלאת הקבצים)
        requiredDocumentsChecklist: formData.requiredDocumentsChecklist || {},
        
        // חתימה
        digitalSignature: formData.digitalSignature || { signed: false, signer: '', date: null },
        
        // הערות
        notes: formData.notes || '',
        
        // פרטי החוקר
        researcherId: researcherId,
        researcherName: researcherName,
        
        // תאריכים מערכתיים
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isNew: true
      };

      console.log('Patent data prepared:', patentData);

      // Create or update document in Firestore
      let docId = editId;
      if (isEdit) {
        await updateDoc(doc(db, 'patents', editId), patentData);
      } else {
        const docRef = await addDoc(collection(db, 'patents'), patentData);
        docId = docRef.id;
        console.log('Document created with ID:', docId);
      }

      // Upload files after document creation
      let applicationFileUrl = '';
      let officialDocsUrls = [];
      
      if (docId && formData.patentApplicationFile) {
        try {
          const fileRef = ref(storage, `patents/${docId}/application/${formData.patentApplicationFile.name}`);
          await uploadBytes(fileRef, formData.patentApplicationFile);
          applicationFileUrl = await getDownloadURL(fileRef);
        } catch (fileError) {
          console.error('Error uploading application file:', fileError);
        }
      }

      if (docId && formData.officialDocuments && formData.officialDocuments.length > 0) {
        try {
          for (let idx = 0; idx < formData.officialDocuments.length; idx++) {
            const file = formData.officialDocuments[idx];
            const fileRef = ref(storage, `patents/${docId}/official/${Date.now()}-${idx}-${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            officialDocsUrls.push(url);
          }
        } catch (fileError) {
          console.error('Error uploading official documents:', fileError);
        }
      }

      // Update document with file URLs if any files were uploaded
      if (docId && (applicationFileUrl || officialDocsUrls.length > 0)) {
        try {
          await updateDoc(doc(db, 'patents', docId), {
            patentApplicationFileUrl: applicationFileUrl || null,
            officialDocuments: officialDocsUrls,
            updatedAt: serverTimestamp(),
          });
        } catch (updateError) {
          console.error('Error updating document with file URLs:', updateError);
        }
      }

      if (docId && formData.researchProposalId) {
        try {
          await updateDoc(doc(db, 'researchProposals', formData.researchProposalId), {
            hasPatent: true,
            linkedPatentIds: arrayUnion(docId),
            updatedAt: serverTimestamp()
          });
        } catch (linkError) {
          console.warn('Failed to link patent to research proposal:', linkError);
        }
      }

      console.log('Patent saved successfully!');
      alert('הפטנט נשמר בהצלחה!');
      navigate(userRole === 'RESEARCHER' ? '/' : '/patents');
    } catch (error) {
      console.error('Error saving patent:', error);
      alert('שגיאה בשמירת הפטנט: ' + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-content" style={{ maxWidth: '1200px' }}>
        <h1>{t('newPatentTitle', 'הוספת פטנט חדש')}</h1>
        <p className="form-subtitle">{t('newPatentSubtitle', 'בקשה לקניין רוחני (כמערכת גמול הצטיינות)')}</p>

        <form onSubmit={handleSubmit} className="research-form">
          {/* כותרת הפרוייקט */}
          <div className="form-section">
            <h2>פרטים כלליים</h2>
            <div className="form-group">
              <label>כותרת הפרוייקט שהוגש לפטנט *</label>
              <input
                type="text"
                name="projectTitle"
                value={formData.projectTitle}
                onChange={handleInputChange}
                className={errors.projectTitle ? 'error' : ''}
                required
              />
              {errors.projectTitle && <span className="error-message">{errors.projectTitle}</span>}
            </div>

            <div className="form-group">
              <label>אחוזי המוסד לפי ההסכם *</label>
              <select
                name="institutionPercentage"
                value={formData.institutionPercentage}
                onChange={handleInputChange}
                className={errors.institutionPercentage ? 'error' : ''}
                required
              >
                <option value="">בחר אחוז</option>
                {institutionPercentageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.institutionPercentage && <span className="error-message">{errors.institutionPercentage}</span>}
            </div>

            <div className="form-group">
              <label>קישור למחקר קיים</label>
              <select
                name="researchProposalId"
                value={formData.researchProposalId}
                onChange={handleInputChange}
                disabled={researchLoading}
              >
                <option value="">בחר מחקר מהרשימה</option>
                {researchOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.title}{userRole === 'ADMIN' ? ` - ${option.researcherName}` : ''}
                  </option>
                ))}
              </select>
              {researchLoadError && <span className="error-message">{researchLoadError}</span>}
            </div>
          </div>

          {/* שותפים */}
          <div className="form-section">
            <h2>שותפים לפטנט</h2>
            {formData.partners.map((partner, index) => (
              <div key={index} className="partner-group">
                <h3>שותף {index + 1}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>שם השותף</label>
                    <input
                      type="text"
                      value={partner.name}
                      onChange={(e) => handlePartnerChange(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>אימייל של השותף</label>
                    <input
                      type="email"
                      value={partner.email}
                      onChange={(e) => handlePartnerChange(index, 'email', e.target.value)}
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
                    />
                  </div>
                  <div className="form-group">
                    <label>אחוזים מוסכמים לפי ההסכם</label>
                    <select
                      value={partner.percentage}
                      onChange={(e) => handlePartnerChange(index, 'percentage', e.target.value)}
                    >
                      <option value="">בחר אחוז</option>
                      {institutionPercentageOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {formData.partners.length > 1 && (
                  <button type="button" onClick={() => removePartner(index)} className="remove-btn">
                    הסר שותף
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addPartner} className="add-btn">
              + הוסף שותף
            </button>
          </div>

          {/* יחידת מסחור */}
          <div className="form-section">
            <h2>יחידת מסחור</h2>
            <div className="form-group">
              <label>שם יח' המסחור דרכה הוגשה הבקשה *</label>
              <select
                name="commercializationUnit"
                value={formData.commercializationUnit}
                onChange={handleInputChange}
                className={errors.commercializationUnit ? 'error' : ''}
                required
              >
                <option value="">בחר יחידת מסחור</option>
                {commercializationUnitOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.commercializationUnit && <span className="error-message">{errors.commercializationUnit}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>איש קשר של יח' המסחור 1</label>
                <input
                  type="text"
                  name="commercializationContact1"
                  value={formData.commercializationContact1}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>אימייל של איש הקשר 1</label>
                <input
                  type="email"
                  name="commercializationEmail1"
                  value={formData.commercializationEmail1}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>איש קשר של יח' המסחור 2</label>
                <input
                  type="text"
                  name="commercializationContact2"
                  value={formData.commercializationContact2}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>אימייל של איש הקשר 2</label>
                <input
                  type="email"
                  name="commercializationEmail2"
                  value={formData.commercializationEmail2}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* מסלול ותפקיד */}
          <div className="form-section">
            <h2>מסלול ותפקיד</h2>
            <div className="form-row">
              <div className="form-group">
                <label>מסלול ההגשה לקרן *</label>
                <select
                  name="submissionPath"
                  value={formData.submissionPath}
                  onChange={handleInputChange}
                  className={errors.submissionPath ? 'error' : ''}
                  required
                >
                  <option value="">בחר מסלול</option>
                  {submissionPathOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.submissionPath && <span className="error-message">{errors.submissionPath}</span>}
              </div>
              <div className="form-group">
                <label>תפקיד החוקר בהגשת הפטנט *</label>
                <select
                  name="researcherRole"
                  value={formData.researcherRole}
                  onChange={handleInputChange}
                  className={errors.researcherRole ? 'error' : ''}
                  required
                >
                  <option value="">בחר תפקיד</option>
                  {researcherRoleOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.researcherRole && <span className="error-message">{errors.researcherRole}</span>}
              </div>
            </div>
          </div>

          {/* סטטוס ושלב */}
          <div className="form-section">
            <h2>סטטוס ושלב</h2>
            <div className="form-row">
              <div className="form-group">
                <label>סטטוס הפטנט *</label>
                <select
                  name="patentStatus"
                  value={formData.patentStatus}
                  onChange={handleInputChange}
                  className={errors.patentStatus ? 'error' : ''}
                  required
                >
                  <option value="">בחר סטטוס</option>
                  {patentStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.patentStatus && <span className="error-message">{errors.patentStatus}</span>}
              </div>
              <div className="form-group">
                <label>שלב הפטנט *</label>
                <select
                  name="patentStage"
                  value={formData.patentStage}
                  onChange={handleInputChange}
                  className={errors.patentStage ? 'error' : ''}
                  required
                >
                  <option value="">בחר שלב</option>
                  {patentStageOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.patentStage && <span className="error-message">{errors.patentStage}</span>}
              </div>
            </div>
          </div>

          {/* זמני ביצוע - תאריכים */}
          <div className="form-section">
            <h2>זמני ביצוע - תאריכים</h2>
            <div className="dates-grid">
              {dateFields.map(({ key, label }) => (
                <div key={key} className="form-group">
                  <label>{label}</label>
                  <div className="date-input-group">
                    <input
                      type="date"
                      value={formData.dates[key]}
                      onChange={(e) => handleDateChange(key, e.target.value)}
                      className={key === 'submissionDate' && errors.submissionDate ? 'error' : ''}
                      required={key === 'submissionDate'}
                    />
                    {formData.dates[key] && (
                      <a
                        href={generateOutlookCalendarLink(formData.dates[key], label)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="calendar-link"
                        title="הוסף ל-Outlook Calendar"
                      >
                        📅
                      </a>
                    )}
                  </div>
                  {key === 'submissionDate' && errors.submissionDate && (
                    <span className="error-message">{errors.submissionDate}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* תקציב */}
          <div className="form-section">
            <h2>תקציב</h2>
            <div className="form-row">
              <div className="form-group">
                <label>הקצאת תקציב לפטנט (7 ספרות) *</label>
                <input
                  type="number"
                  name="totalBudget"
                  value={formData.totalBudget}
                  onChange={handleInputChange}
                  maxLength={7}
                  className={errors.totalBudget ? 'error' : ''}
                  required
                />
                {errors.totalBudget && <span className="error-message">{errors.totalBudget}</span>}
              </div>
              <div className="form-group">
                <label>מטבע</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                >
                  {currencyOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>תקציב מתורגם (שקלים)</label>
                <input
                  type="number"
                  name="convertedBudget"
                  value={formData.convertedBudget}
                  readOnly
                  style={{ background: '#f5f5f5' }}
                />
              </div>
            </div>

            {/* תקציב משוער לכל שלב */}
            <div className="form-group">
              <label>תקציב משוער לכל שלב</label>
              {patentStageOptions.map(stage => (
                <div key={stage.value} className="form-row" style={{ marginBottom: '10px' }}>
                  <label style={{ width: '200px', marginTop: '8px' }}>{stage.label}:</label>
                  <input
                    type="number"
                    value={formData.stageBudgets[stage.value] || ''}
                    onChange={(e) => handleStageBudgetChange(stage.value, e.target.value)}
                    placeholder="הכנס תקציב"
                    style={{ flex: 1 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* מסמכים */}
          <div className="form-section">
            <h2>מסמכים</h2>
            <div className="form-group">
              <label>מסמך הבקשה לפטנט</label>
              <input
                type="file"
                onChange={(e) => handleFileChange('patentApplicationFile', e.target.files[0])}
                accept=".pdf,.doc,.docx"
              />
              {formData.patentApplicationFile && (
                <span className="file-name">{formData.patentApplicationFile.name}</span>
              )}
            </div>

            <div className="form-group">
              <label>צ'קליסט מסמכים להגשה</label>
              <div className="checklist">
                {requiredDocuments.map(doc => (
                  <label key={doc} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.requiredDocumentsChecklist[doc] || false}
                      onChange={(e) => handleChecklistChange(doc, e.target.checked)}
                    />
                    {doc}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>מסמכים רשמיים ואישורים</label>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  Array.from(e.target.files).forEach(file => {
                    handleFileChange('officialDocuments', file);
                  });
                }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {formData.officialDocuments.length > 0 && (
                <div className="files-list">
                  {formData.officialDocuments.map((file, index) => (
                    <div key={index} className="file-item">
                      <span>{file.name}</span>
                      <button type="button" onClick={() => removeOfficialDocument(index)} className="remove-btn-small">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* חתימה דיגיטלית */}
          <div className="form-section">
            <h2>חתימה דיגיטלית</h2>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.digitalSignature.signed}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    digitalSignature: {
                      ...prev.digitalSignature,
                      signed: e.target.checked,
                      signer: e.target.checked ? user?.name || '' : '',
                      date: e.target.checked ? new Date().toISOString().split('T')[0] : ''
                    }
                  }))}
                />
                אני מאשר/ת את נכונות הפרטים ומאשר/ת את הגשת הבקשה
              </label>
              {formData.digitalSignature.signed && (
                <div className="signature-info">
                  <p>חתום על ידי: {formData.digitalSignature.signer}</p>
                  <p>תאריך: {formData.digitalSignature.date}</p>
                </div>
              )}
            </div>
          </div>

          {/* הערות */}
          <div className="form-section">
            <h2>הערות</h2>
            <div className="form-group">
              <label>הערות (כתיבה חופשית)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={5}
                placeholder="הכנס הערות נוספות..."
              />
            </div>
          </div>

          {/* כפתורי שליחה */}
          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => {
                // If editing, go back to the patent detail page
                if (editId) {
                  navigate(`/patents/${editId}`);
                } else {
                  navigate(userRole === 'RESEARCHER' ? '/' : '/patents');
                }
              }} 
              className="cancel-btn"
            >
              {t('cancel', 'ביטול')}
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? t('saving', 'שומר...') : t('savePatent', 'שמור פטנט')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPatent;

