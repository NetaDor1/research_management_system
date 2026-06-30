// Script to initialize Firebase Collections
// Run this once to set up the database structure
// You can run this from browser console or create a setup page

import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Initialize Firebase Collections with sample data structure
 * Run this function once to set up your database
 */
export const initializeFirebaseCollections = async () => {
  try {
    console.log('Starting Firebase initialization...');

    // 1. Create sample user documents structure
    // Note: You need to create users in Firebase Authentication first
    // Then create corresponding documents in 'users' collection with their UID
    
    console.log('✓ Users collection structure ready');
    console.log('  - Create users in Firebase Authentication');
    console.log('  - Then create documents in "users" collection with UID as document ID');

    // 2. Create sample research proposal structure
    const sampleResearchRef = doc(collection(db, 'researchProposals'));
    const sampleResearchData = {
      projectTitle: 'דוגמה: מחקר חדשני',
      fundName: 'קרן המדען הראשי',
      submissionPath: 'מסלול רגיל',
      researcherRole: 'חוקר ראשי',
      proposalStage: 'הצעה מלאה',
      researcherId: 'SAMPLE_USER_ID', // Replace with actual UID
      researcherName: 'דוגמה: נטע דור',
      researchStartDate: new Date('2024-01-01'),
      researchEndDate: new Date('2025-06-30'),
      researchDurationYears: '1.5',
      academicYear: 'תשפ"ה',
      totalBudget: '500000',
      currency: 'ILS',
      convertedBudget: '500000',
      budgetComponents: {
        'כ"א (כוח אדם)': '300000',
        'ציוד': '150000',
        'נסיעות': '50000'
      },
      partners: [
        {
          name: 'שותף דוגמה',
          email: 'partner@example.com',
          institution: 'אוניברסיטה',
          country: 'ישראל'
        }
      ],
      researchProposalFileUrl: '',
      officialDocuments: [],
      requiredDocumentsChecklist: {
        'קורות חיים': true,
        'תקציר המחקר': true,
        'מכתב המלצה': false
      },
      digitalSignature: {
        signed: false,
        signer: '',
        date: null
      },
      expectedResponseDate: new Date('2024-12-31'),
      notes: 'הערות לדוגמה',
      status: 'pending',
      hasPatent: false,
      submissionDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Don't actually create the sample - just show structure
    console.log('✓ Research Proposals collection structure ready');
    console.log('  Sample structure:', sampleResearchData);

    // 3. Create sample patent structure
    const samplePatentData = {
      title: 'דוגמה: פטנט חדשני',
      researcherId: 'SAMPLE_USER_ID', // Replace with actual UID
      researcherName: 'דוגמה: נטע דור',
      status: 'registered', // 'registered', 'approved', 'in-process', 'rejected'
      registrationDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log('✓ Patents collection structure ready');
    console.log('  Sample structure:', samplePatentData);

    // 4. Create sample article structure
    const sampleArticleData = {
      title: 'דוגמה: מאמר מדעי',
      researcherId: 'SAMPLE_USER_ID', // Replace with actual UID
      researcherName: 'דוגמה: נטע דור',
      status: 'published', // 'published', 'in-review', 'rejected'
      publicationDate: serverTimestamp(),
      publicationType: 'journal', // 'journal' or 'conference'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log('✓ Articles collection structure ready');
    console.log('  Sample structure:', sampleArticleData);

    console.log('\n✅ Firebase Collections structure initialized!');
    console.log('\nNext steps:');
    console.log('1. Go to Firebase Console → Firestore Database');
    console.log('2. Create the collections: users, researchProposals, patents, articles');
    console.log('3. Set up Security Rules (see instructions below)');
    console.log('4. Create users in Authentication and corresponding documents in "users" collection');

    return {
      success: true,
      message: 'Collections structure ready. See console for details.'
    };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create a user document in Firestore
 * Call this after creating a user in Firebase Authentication
 */
export const createUserDocument = async (uid, userData) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      name: userData.name,
      email: userData.email,
      role: userData.role || 'RESEARCHER',
      accountStatus: userData.accountStatus || 'approved',
      authProvider: userData.authProvider || 'email',
      rejectionReason: null,
      approvedAt: userData.accountStatus === 'pending' ? null : serverTimestamp(),
      approvedBy: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('User document created:', uid);
    return { success: true };
  } catch (error) {
    console.error('Error creating user document:', error);
    return { success: false, error: error.message };
  }
};

// Export for use in browser console or setup page
if (typeof window !== 'undefined') {
  window.initializeFirebase = initializeFirebaseCollections;
  window.createUserDocument = createUserDocument;
}

