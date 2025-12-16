// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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