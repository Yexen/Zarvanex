import { useEffect, useState } from 'react';
import { getFirebaseMessaging, getToken, onMessage } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDB } from '@/lib/firebase';

export function useNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    try {
      if (!getFirebaseMessaging()) {
        throw new Error('Messaging not supported');
      }

      if (typeof Notification === 'undefined') {
        throw new Error('Notifications not supported on this device');
      }

      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        // Get FCM token
        const token = await getToken(getFirebaseMessaging(), {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (token) {
          setFcmToken(token);

          // Save token to Firestore for this user
          if (user) {
            await addDoc(collection(getFirebaseDB(), 'fcmTokens'), {
              userId: user.uid,
              token,
              createdAt: serverTimestamp(),
            });
          }
        }
      }

      return permission;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to get permission');
      throw err;
    }
  };

  useEffect(() => {
    if (getFirebaseMessaging() && permission === 'granted') {
      // Handle foreground messages
      const unsubscribe = onMessage(getFirebaseMessaging(), (payload) => {
        console.log('Foreground message received:', payload);

        // Show notification in foreground
        if (payload.notification && typeof Notification !== 'undefined') {
          new Notification(payload.notification.title || 'Zarvanex', {
            body: payload.notification.body,
            icon: '/Logo.png',
          });
        }
      });

      return () => unsubscribe();
    }
  }, [permission]);

  const showLocalNotification = (title: string, body: string, options?: NotificationOptions) => {
    if (permission === 'granted' && typeof Notification !== 'undefined') {
      new Notification(title, {
        body,
        icon: '/Logo.png',
        ...options,
      });
    }
  };

  return {
    permission,
    fcmToken,
    error,
    requestPermission,
    showLocalNotification,
  };
}
