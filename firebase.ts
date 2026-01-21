
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAtx8Wj0iA7ZQ72PFvVYozcyAOESEytj5Q",
    authDomain: "saladoopreport-2026.firebaseapp.com",
    projectId: "saladoopreport-2026",
    storageBucket: "saladoopreport-2026.firebasestorage.app",
    messagingSenderId: "344568878358",
    appId: "1:344568878358:web:0538c3b11de243c3802c37"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
