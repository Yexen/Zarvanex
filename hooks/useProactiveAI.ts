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
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';

export interface ProactiveMessage {
  id: string;
  userId: string;
  trigger: 'time' | 'reminder' | 'custom';
  message: string;
  scheduledTime: Date;
  sent: boolean;
  conversationId?: string;
  createdAt: Date;
}

// Predefined proactive message templates
const PROACTIVE_TEMPLATES = [
  {
    time: '09:00',
    messages: [
      "Good morning! Ready to start the day? What's on your mind?",
      "Morning! How can I help you be productive today?",
      "Hey there! Starting a new day - what would you like to work on?",
    ],
  },
  {
    time: '12:00',
    messages: [
      "Midday check-in! How's everything going?",
      "Taking a break? Want to chat about anything?",
      "Afternoon! Need any assistance with your tasks?",
    ],
  },
  {
    time: '18:00',
    messages: [
      "Evening! How was your day?",
      "Wrapping up for the day? Let me know if you need anything.",
      "Good evening! Ready to wind down or still working?",
    ],
  },
  {
    time: '21:00',
    messages: [
      "Late evening check-in. Everything alright?",
      "Still up? Want to chat or reflect on the day?",
      "Evening! Need help with anything before calling it a day?",
    ],
  },
];

export function useProactiveAI() {
  const { user } = useAuth();
  const { showLocalNotification, permission } = useNotifications();
  const [proactiveMessages, setProactiveMessages] = useState<ProactiveMessage[]>([]);
  const [enabled, setEnabled] = useState(false);

  // Load user's proactive AI preference
  useEffect(() => {
    if (!user) {
      setEnabled(false);
      return;
    }

    const stored = localStorage.getItem(`proactive-ai-${user.uid}`);
    setEnabled(stored === 'true');
  }, [user]);

  const toggleProactiveAI = (enable: boolean) => {
    if (!user) return;
    setEnabled(enable);
    localStorage.setItem(`proactive-ai-${user.uid}`, String(enable));
  };

  // Schedule daily proactive messages
  useEffect(() => {
    if (!user || !enabled) return;

    const scheduleMessages = async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Check if we've already scheduled messages for today
      const existingQuery = query(
        collection(db, 'proactiveMessages'),
        where('userId', '==', user.uid),
        where('scheduledTime', '>=', Timestamp.fromDate(today)),
        where('sent', '==', false)
      );

      const snapshot = await new Promise<any>((resolve) => {
        const unsubscribe = onSnapshot(existingQuery, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });

      if (!snapshot.empty) {
        console.log('Proactive messages already scheduled for today');
        return;
      }

      // Schedule new messages
      for (const template of PROACTIVE_TEMPLATES) {
        const [hours, minutes] = template.time.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Only schedule if time hasn't passed yet today
        if (scheduledTime > now) {
          const randomMessage = template.messages[Math.floor(Math.random() * template.messages.length)];

          await addDoc(collection(db, 'proactiveMessages'), {
            userId: user.uid,
            trigger: 'time',
            message: randomMessage,
            scheduledTime: Timestamp.fromDate(scheduledTime),
            sent: false,
            createdAt: serverTimestamp(),
          });
        }
      }
    };

    // Schedule messages now and at midnight
    scheduleMessages();

    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const midnightTimeout = setTimeout(() => {
      scheduleMessages();
      // Set up daily interval
      const dailyInterval = setInterval(scheduleMessages, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, [user, enabled]);

  // Load and monitor proactive messages
  useEffect(() => {
    if (!user) {
      setProactiveMessages([]);
      return;
    }

    const q = query(
      collection(db, 'proactiveMessages'),
      where('userId', '==', user.uid),
      where('sent', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: ProactiveMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          userId: data.userId,
          trigger: data.trigger,
          message: data.message,
          scheduledTime: data.scheduledTime?.toDate() || new Date(),
          sent: data.sent || false,
          conversationId: data.conversationId,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setProactiveMessages(messages);
    });

    return () => unsubscribe();
  }, [user]);

  // Check for due messages every minute
  useEffect(() => {
    if (!user || !enabled || permission !== 'granted') return;

    const checkMessages = () => {
      const now = new Date();

      proactiveMessages.forEach(async (msg) => {
        if (!msg.sent && msg.scheduledTime <= now) {
          // Show notification
          showLocalNotification(
            'Zarvanex wants to chat',
            msg.message,
            {
              tag: `proactive-${msg.id}`,
              requireInteraction: true,
              data: {
                url: '/',
                proactiveMessageId: msg.id,
              },
            }
          );

          // Mark as sent
          await updateDoc(doc(db, 'proactiveMessages', msg.id), {
            sent: true,
          });
        }
      });
    };

    checkMessages();
    const interval = setInterval(checkMessages, 60000);

    return () => clearInterval(interval);
  }, [proactiveMessages, user, enabled, permission, showLocalNotification]);

  const sendProactiveMessage = async (
    message: string,
    scheduledTime?: Date,
    conversationId?: string
  ) => {
    if (!user) throw new Error('Must be logged in');

    await addDoc(collection(db, 'proactiveMessages'), {
      userId: user.uid,
      trigger: 'custom',
      message,
      scheduledTime: Timestamp.fromDate(scheduledTime || new Date()),
      sent: false,
      conversationId,
      createdAt: serverTimestamp(),
    });
  };

  return {
    enabled,
    toggleProactiveAI,
    proactiveMessages,
    sendProactiveMessage,
  };
}
