import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  message: string;
  scheduledTime: Date;
  conversationId?: string;
  recurring?: 'daily' | 'weekly' | 'monthly';
  completed: boolean;
  notified: boolean;
  createdAt: Date;
}

export function useReminders() {
  const { user } = useAuth();
  const { showLocalNotification, permission } = useNotifications();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Load reminders from Firestore
  useEffect(() => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', user.uid),
      where('completed', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedReminders: Reminder[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedReminders.push({
          id: doc.id,
          userId: data.userId,
          title: data.title,
          message: data.message,
          scheduledTime: data.scheduledTime?.toDate() || new Date(),
          conversationId: data.conversationId,
          recurring: data.recurring,
          completed: data.completed || false,
          notified: data.notified || false,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setReminders(loadedReminders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Check for due reminders every minute
  useEffect(() => {
    if (!user || permission !== 'granted') return;

    const checkReminders = () => {
      const now = new Date();

      reminders.forEach(async (reminder) => {
        if (!reminder.notified && reminder.scheduledTime <= now) {
          // Show notification
          showLocalNotification(reminder.title, reminder.message, {
            tag: `reminder-${reminder.id}`,
            requireInteraction: true,
            data: {
              url: reminder.conversationId ? `/?conversation=${reminder.conversationId}` : '/',
            },
          });

          // Mark as notified
          await updateDoc(doc(db, 'reminders', reminder.id), {
            notified: true,
          });

          // Handle recurring reminders
          if (reminder.recurring) {
            const nextTime = new Date(reminder.scheduledTime);

            switch (reminder.recurring) {
              case 'daily':
                nextTime.setDate(nextTime.getDate() + 1);
                break;
              case 'weekly':
                nextTime.setDate(nextTime.getDate() + 7);
                break;
              case 'monthly':
                nextTime.setMonth(nextTime.getMonth() + 1);
                break;
            }

            // Create new reminder for next occurrence
            await addDoc(collection(db, 'reminders'), {
              userId: user.uid,
              title: reminder.title,
              message: reminder.message,
              scheduledTime: Timestamp.fromDate(nextTime),
              conversationId: reminder.conversationId,
              recurring: reminder.recurring,
              completed: false,
              notified: false,
              createdAt: serverTimestamp(),
            });

            // Mark current reminder as completed
            await updateDoc(doc(db, 'reminders', reminder.id), {
              completed: true,
            });
          }
        }
      });
    };

    // Check immediately and then every minute
    checkReminders();
    const interval = setInterval(checkReminders, 60000);

    return () => clearInterval(interval);
  }, [reminders, user, permission, showLocalNotification]);

  const createReminder = async (
    title: string,
    message: string,
    scheduledTime: Date,
    conversationId?: string,
    recurring?: 'daily' | 'weekly' | 'monthly'
  ) => {
    if (!user) throw new Error('Must be logged in to create reminders');

    await addDoc(collection(db, 'reminders'), {
      userId: user.uid,
      title,
      message,
      scheduledTime: Timestamp.fromDate(scheduledTime),
      conversationId,
      recurring,
      completed: false,
      notified: false,
      createdAt: serverTimestamp(),
    });
  };

  const deleteReminder = async (reminderId: string) => {
    await deleteDoc(doc(db, 'reminders', reminderId));
  };

  const completeReminder = async (reminderId: string) => {
    await updateDoc(doc(db, 'reminders', reminderId), {
      completed: true,
    });
  };

  return {
    reminders,
    loading,
    createReminder,
    deleteReminder,
    completeReminder,
  };
}
