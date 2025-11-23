import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Tu configuración generada por Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA235nSZ2B_eZdN0kkNb7I_R31DToJHLb8",
  authDomain: "pediatria-app-37863.firebaseapp.com",
  projectId: "pediatria-app-37863",
  storageBucket: "pediatria-app-37863.firebasestorage.app",
  messagingSenderId: "499714313702",
  appId: "1:499714313702:web:d22cea346acc44f60d9a27",
  measurementId: "G-JDVX33L3QX", // puedes dejarlo, pero no se usa en Expo
};

// Inicializar Firebase solo una vez
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
