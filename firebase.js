import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBxXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXq",
  authDomain: "gymtracker-12345.firebaseapp.com",
  projectId: "gymtracker-12345",
  storageBucket: "gymtracker-12345.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef1234567890"
};

// Inicializar Firebase solo si no existe una instancia
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Obtener instancias de Auth y Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app; 