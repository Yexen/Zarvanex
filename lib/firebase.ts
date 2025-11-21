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

// Initialize Firebase (client-side only) - using lazy initialization
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _messaging: Messaging | null = null;

function initializeFirebase() {
  if (_app) return _app;

  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be initialized on the client-side');
  }

  try {
    _app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    _auth = getAuth(_app);
    _db = getFirestore(_app);

    // Initialize Firebase Messaging
    try {
      _messaging = getMessaging(_app);
    } catch (error) {
      console.log('Messaging not supported:', error);
    }

    return _app;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

// Getter functions with lazy initialization
export function getFirebaseApp(): FirebaseApp {
  if (!_app) initializeFirebase();
  return _app!;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) initializeFirebase();
  return _auth!;
}

export function getFirebaseDB(): Firestore {
  if (!_db) initializeFirebase();
  return _db!;
}

export function getFirebaseMessaging(): Messaging | null {
  if (!_app) initializeFirebase();
  return _messaging;
}

// Create proxy objects that delay initialization until first access
let _appProxy: any = null;
let _authProxy: any = null;
let _dbProxy: any = null;
let _messagingProxy: any = null;

export const app = new Proxy({} as any, {
  get(target, prop) {
    if (typeof window === 'undefined') return undefined;
    if (!_appProxy) _appProxy = getFirebaseApp();
    return _appProxy[prop];
  }
});

export const auth = new Proxy({} as any, {
  get(target, prop) {
    if (typeof window === 'undefined') return undefined;
    if (!_authProxy) _authProxy = getFirebaseAuth();
    return _authProxy[prop];
  }
});

export const db = new Proxy({} as any, {
  get(target, prop) {
    if (typeof window === 'undefined') return undefined;
    if (!_dbProxy) _dbProxy = getFirebaseDB();
    return _dbProxy[prop];
  }
});

export const messaging = new Proxy({} as any, {
  get(target, prop) {
    if (typeof window === 'undefined') return null;
    if (!_messagingProxy) _messagingProxy = getFirebaseMessaging();
    return _messagingProxy ? _messagingProxy[prop] : null;
  }
});

// Re-export Firebase functions
export { getToken, onMessage };
