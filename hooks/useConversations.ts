'use client';

import { useEffect, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import type { Conversation, Message } from '@/types';

// Firestore document type
interface ConversationDoc {
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Timestamp;
    images?: string[];
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  modelId: string;
}

export function useConversations(userId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { getFirebaseDB } = await import('@/lib/firebase');
        const { collection, query, orderBy, onSnapshot } = await import('firebase/firestore');
        const db = getFirebaseDB();

        // Reference to user's conversations collection
        const conversationsRef = collection(db, 'users', userId, 'conversations');
        const q = query(conversationsRef, orderBy('updatedAt', 'desc'));

        // Listen for real-time updates
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const loadedConversations: Conversation[] = snapshot.docs.map((docSnapshot) => {
              const data = docSnapshot.data() as ConversationDoc;
              return {
                id: docSnapshot.id,
                title: data.title,
                messages: data.messages.map((msg) => ({
                  ...msg,
                  timestamp: msg.timestamp?.toDate() || new Date(),
                })),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                modelId: data.modelId,
              };
            });
            setConversations(loadedConversations);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error('Error loading conversations:', err);
            setError(err as Error);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up conversations listener:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  // Create a new conversation
  const createConversation = async (modelId: string): Promise<string | null> => {
    if (!userId) {
      console.error('Cannot create conversation: No user ID');
      return null;
    }

    try {
      console.log('Creating conversation for user:', userId);
      const { getFirebaseDB } = await import('@/lib/firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const db = getFirebaseDB();

      const conversationsRef = collection(db, 'users', userId, 'conversations');
      const docRef = await addDoc(conversationsRef, {
        title: 'New Conversation',
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        modelId,
      });
      console.log('Conversation created successfully:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('Error creating conversation:', err);
      console.error('Error details:', {
        code: (err as any)?.code,
        message: (err as any)?.message,
        userId,
      });
      throw err;
    }
  };

  // Add a message to a conversation
  const addMessage = async (conversationId: string, message: Message, newTitle?: string): Promise<void> => {
    if (!userId) return;

    try {
      const { getFirebaseDB } = await import('@/lib/firebase');
      const { doc, updateDoc, Timestamp, arrayUnion, serverTimestamp } = await import('firebase/firestore');
      const db = getFirebaseDB();

      const conversationRef = doc(db, 'users', userId, 'conversations', conversationId);

      // Clean message data - remove undefined fields
      const cleanMessage: any = {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: Timestamp.fromDate(message.timestamp),
      };

      // Only add images if they exist
      if (message.images && message.images.length > 0) {
        cleanMessage.images = message.images;
      }

      // Build update object without undefined values
      const updateData: any = {
        messages: arrayUnion(cleanMessage), // Use arrayUnion to append without race conditions
        updatedAt: serverTimestamp(),
      };

      // Only add title if provided
      if (newTitle) {
        updateData.title = newTitle;
      }

      await updateDoc(conversationRef, updateData);
    } catch (err) {
      console.error('Error adding message:', err);
      throw err;
    }
  };

  // Update conversation metadata
  const updateConversation = async (
    conversationId: string,
    updates: Partial<{ title: string; modelId: string }>
  ): Promise<void> => {
    if (!userId) return;

    try {
      const conversationRef = doc(db, 'users', userId, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating conversation:', err);
      throw err;
    }
  };

  // Delete a conversation
  const deleteConversation = async (conversationId: string): Promise<void> => {
    if (!userId) return;

    try {
      const conversationRef = doc(db, 'users', userId, 'conversations', conversationId);
      await deleteDoc(conversationRef);
    } catch (err) {
      console.error('Error deleting conversation:', err);
      throw err;
    }
  };

  // Replace all messages in a conversation
  const setMessages = async (conversationId: string, messages: Message[]): Promise<void> => {
    if (!userId) return;

    try {
      const conversationRef = doc(db, 'users', userId, 'conversations', conversationId);

      // Convert messages to Firestore format
      const cleanMessages = messages.map(msg => {
        const cleanMessage: any = {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: Timestamp.fromDate(msg.timestamp),
        };

        if (msg.images && msg.images.length > 0) {
          cleanMessage.images = msg.images;
        }

        return cleanMessage;
      });

      await updateDoc(conversationRef, {
        messages: cleanMessages,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error setting messages:', err);
      throw err;
    }
  };

  return {
    conversations,
    loading,
    error,
    createConversation,
    addMessage,
    updateConversation,
    deleteConversation,
    setMessages,
  };
}
