import { initializeApp, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Firebase configuration with EUROPE-WEST3 regional settings
// Important: Firebase Storage in EU region uses .firebasestorage.app domain
// rather than .appspot.com that might be used in US regions
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "memorybook2-4df48.firebasestorage.app", // EU region format (.firebasestorage.app)
  messagingSenderId: "664136376571", 
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// For debugging
console.log("Firebase config (without sensitive data):", {
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "memorybook2-4df48.firebasestorage.app",
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  hasAppId: !!import.meta.env.VITE_FIREBASE_APP_ID
});

// Explicitly log the full storage bucket for debugging
console.log(`Storage bucket configured as: memorybook2-4df48.firebasestorage.app`);

// Initialize Firebase (only once)
let app;
try {
  // Try to get existing app
  app = getApp();
  console.log("Using existing Firebase app");
} catch (error) {
  // Initialize a new app if none exists
  app = initializeApp(firebaseConfig);
  console.log("Initialized new Firebase app");
}

// Get services from the app
const auth = getAuth(app);
// Create storage with explicit region
const storage = getStorage(app);
const firestore = getFirestore(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
    // The user will be redirected to the Google sign-in page
    // After sign-in, they'll be redirected back to the app
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Handle redirect result
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return result.user;
    }
    return null;
  } catch (error) {
    console.error("Error handling redirect result:", error);
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Error signing in with email:", error);
    throw error;
  }
};

// Create user with email and password
export const createUserWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Sign out
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export { app, auth, storage, firestore };
