// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxSsc3esYg545-XprEcOh5_iQFiyx8LX0",
  authDomain: "research-management-syst-11bea.firebaseapp.com",
  projectId: "research-management-syst-11bea",
  storageBucket: "research-management-syst-11bea.firebasestorage.app",
  messagingSenderId: "222247324838",
  appId: "1:222247324838:web:1e8773d29bc2c6eb4ff867",
  measurementId: "G-VLCKTQ0L94"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;