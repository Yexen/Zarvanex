'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('useAuth: Setting up auth listener');

    // Dynamically import Firebase to avoid SSR issues
    let unsubscribe: (() => void) | undefined;

    const setupAuth = async () => {
      try {
        const { getFirebaseAuth } = await import('@/lib/firebase');
        const { onAuthStateChanged } = await import('firebase/auth');
        const auth = getFirebaseAuth();

        if (!auth) {
          console.warn('useAuth: Firebase auth not initialized');
          setLoading(false);
          return;
        }

        // Listen to auth state changes (no auto anonymous sign-in)
        unsubscribe = onAuthStateChanged(
          auth,
          (firebaseUser) => {
            console.log('useAuth: Auth state changed:', firebaseUser?.uid || 'No user');
            setUser(firebaseUser);
            setLoading(false);
          },
          (err) => {
            console.error('useAuth: Auth state change error:', err);
            setError(err as Error);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('useAuth: Failed to initialize auth:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    setupAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const { getFirebaseAuth } = await import('@/lib/firebase');
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase auth not initialized');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign-in successful:', result.user.uid);
      return result.user;
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Email/Password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { getFirebaseAuth } = await import('@/lib/firebase');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase auth not initialized');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Email sign-in successful:', result.user.uid);
      return result.user;
    } catch (err) {
      console.error('Email sign-in error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up with Email/Password
  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { getFirebaseAuth } = await import('@/lib/firebase');
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase auth not initialized');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Email sign-up successful:', result.user.uid);
      return result.user;
    } catch (err) {
      console.error('Email sign-up error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { getFirebaseAuth } = await import('@/lib/firebase');
      const { signOut: firebaseSignOut } = await import('firebase/auth');
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase auth not initialized');
      await firebaseSignOut(auth);
      console.log('Sign-out successful');
    } catch (err) {
      console.error('Sign-out error:', err);
      setError(err as Error);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}
