import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDB } from './firebase';
import type { Conversation } from '@/types';

const CONVERSATIONS_COLLECTION = 'conversations';

export async function saveConversation(userId: string, conversation: Conversation): Promise<void> {
  const db = getFirebaseDB();

  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversation.id);
  await setDoc(conversationRef, {
    ...conversation,
    userId,
    createdAt: Timestamp.fromDate(new Date(conversation.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(conversation.updatedAt)),
    messages: conversation.messages.map((msg) => ({
      ...msg,
      timestamp: Timestamp.fromDate(new Date(msg.timestamp)),
    })),
  });
}

export async function loadConversations(userId: string): Promise<Conversation[]> {
  const db = getFirebaseDB();

  const conversationsQuery = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(conversationsQuery);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      messages: data.messages.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp.toDate(),
      })),
    } as Conversation;
  });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const db = getFirebaseDB();

  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await deleteDoc(conversationRef);
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const db = getFirebaseDB();

  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  const snapshot = await getDoc(conversationRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    messages: data.messages.map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp.toDate(),
    })),
  } as Conversation;
}
