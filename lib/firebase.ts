import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCovE6krbHo8OYGSRui0-YPXzJ43HaToiw",
  authDomain: "zarvanex.firebaseapp.com",
  projectId: "zarvanex",
  storageBucket: "zarvanex.firebasestorage.app",
  messagingSenderId: "779388808610",
  appId: "1:779388808610:web:72f9466a80d3ce3b9696fb"
};

// Initialize Firebase (client-side only)
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _messaging: Messaging | null = null;

export function initializeFirebaseClient(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be initialized on the client side.');
  }

  if (_app) {
    return _app;
  }

  try {
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _db = getFirestore(_app);

    // Initialize Firebase Messaging
    try {
      _messaging = getMessaging(_app);
    } catch (error) {
      console.log('Firebase Messaging not supported in this environment or an error occurred:', error);
      _messaging = null; // Ensure it's explicitly null if not supported
    }

    return _app;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

// Getter functions
export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    initializeFirebaseClient();
  }
  if (!_app) throw new Error('Firebase App is not initialized.'); // Should not happen if initializeFirebaseClient throws
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    initializeFirebaseClient();
  }
  if (!_auth) throw new Error('Firebase Auth is not initialized.');
  return _auth;
}

export function getFirebaseDB(): Firestore {
  if (!_db) {
    initializeFirebaseClient();
  }
  if (!_db) throw new Error('Firebase Firestore is not initialized.');
  return _db;
}

export function getFirebaseMessaging(): Messaging | null { // Messaging can legitimately be null
  if (!_app) { // Only initialize if _app is null, otherwise _messaging might already be attempted
    initializeFirebaseClient();
  }
  return _messaging;
}

// Re-export Firebase functions
export { getToken, onMessage };
