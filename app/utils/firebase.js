import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDJ-gMuqy1a2gFRBPe8AFRDywq8iHaVRaA",
    authDomain: "gymtracer-82b6b.firebaseapp.com",
    projectId: "gymtracer-82b6b",
    storageBucket: "gymtracer-82b6b.firebasestorage.app",
    messagingSenderId: "506977047243",
    appId: "1:506977047243:web:eb3c3bfd98f2b13225014e"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
