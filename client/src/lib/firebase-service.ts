import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  orderBy, 
  Timestamp, 
  getDoc, 
  limit,
  QueryDocumentSnapshot,
  writeBatch
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "./firebase";
import { Memory, MemoryType } from "@shared/schema";

// Memory collection reference
const memoriesCollection = collection(firestore, "memories");
const dailyMemoriesCollection = collection(firestore, "dailyMemories");

// Interface for Firestore memory document
interface FirestoreMemory {
  userId: string;
  relationshipId: number;
  type: string;
  content: string;
  caption?: string;
  imageUrl?: string;
  createdAt: Timestamp;
  thumbsUpCount: number;
  isNew: boolean; // Flag to indicate a newly added memory
}

interface FirestoreDailyMemory {
  relationshipId: number;
  memoryIds: string[];
  date: Timestamp;
}

// Convert Firestore document to Memory type
function convertToMemory(doc: QueryDocumentSnapshot): Memory {
  const data = doc.data() as FirestoreMemory;
  return {
    id: parseInt(doc.id),
    userId: parseInt(data.userId),
    relationshipId: data.relationshipId,
    type: data.type as MemoryType,
    content: data.content,
    createdAt: data.createdAt.toDate(),
    thumbsUpCount: data.thumbsUpCount,
    caption: data.caption || null,
    imageUrl: data.imageUrl || null,
    isNew: data.isNew || false
  };
}

// Get memories for a relationship
export async function getRelationshipMemories(relationshipId: number): Promise<Memory[]> {
  const q = query(
    memoriesCollection,
    where("relationshipId", "==", relationshipId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  const memories = querySnapshot.docs.map(convertToMemory);
  return memories;
}

// Get today's memories for a relationship
export async function getDailyMemories(relationshipId: number): Promise<Memory[]> {
  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Create a query to get the daily memories document for today
  const q = query(
    dailyMemoriesCollection,
    where("relationshipId", "==", relationshipId),
    where("date", ">=", today)
  );
  
  const querySnapshot = await getDocs(q);
  
  // If no daily memories exist for today, return an empty array
  if (querySnapshot.empty) {
    return [];
  }
  
  // Get the memory IDs from the daily memories document
  const dailyMemory = querySnapshot.docs[0].data() as FirestoreDailyMemory;
  
  // If there are no memory IDs, return an empty array
  if (!dailyMemory.memoryIds || dailyMemory.memoryIds.length === 0) {
    return [];
  }
  
  // Get the memories from the memories collection
  const memories: Memory[] = [];
  
  for (const memoryId of dailyMemory.memoryIds) {
    const memoryDoc = await getDoc(doc(memoriesCollection, memoryId));
    if (memoryDoc.exists()) {
      memories.push(convertToMemory(memoryDoc));
    }
  }
  
  return memories;
}

// Get newly added memories for a relationship
export async function getNewMemories(relationshipId: number): Promise<Memory[]> {
  const q = query(
    memoriesCollection,
    where("relationshipId", "==", relationshipId),
    where("isNew", "==", true),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  const memories = querySnapshot.docs.map(convertToMemory);
  return memories;
}

// Create a new memory
export async function createMemory(data: {
  userId: string;
  relationshipId: number;
  type: string;
  content: string;
  caption?: string;
  file?: File;
}): Promise<Memory> {
  let imageUrl = "";
  
  // If there's a file, upload it to Firebase Storage
  if (data.file && data.type === "image") {
    const storageRef = ref(storage, `memories/${data.relationshipId}/${Date.now()}_${data.file.name}`);
    const snapshot = await uploadBytes(storageRef, data.file);
    imageUrl = await getDownloadURL(snapshot.ref);
  }
  
  // Create memory document
  const memoryData: FirestoreMemory = {
    userId: data.userId,
    relationshipId: data.relationshipId,
    type: data.type,
    content: data.content,
    caption: data.caption,
    imageUrl: imageUrl || "",
    createdAt: serverTimestamp() as Timestamp,
    thumbsUpCount: 0,
    isNew: true // Mark as new when created
  };
  
  const docRef = await addDoc(memoriesCollection, memoryData);
  
  // Create a daily memory record if it doesn't exist
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dailyMemoryQuery = query(
    dailyMemoriesCollection,
    where("relationshipId", "==", data.relationshipId),
    where("date", ">=", today)
  );
  
  const dailyMemorySnapshot = await getDocs(dailyMemoryQuery);
  
  if (dailyMemorySnapshot.empty) {
    // Create a new daily memory
    await addDoc(dailyMemoriesCollection, {
      relationshipId: data.relationshipId,
      memoryIds: [docRef.id],
      date: serverTimestamp()
    });
  } else {
    // Update existing daily memory
    const dailyMemoryDoc = dailyMemorySnapshot.docs[0];
    const dailyMemoryData = dailyMemoryDoc.data() as FirestoreDailyMemory;
    
    await updateDoc(dailyMemoryDoc.ref, {
      memoryIds: [...(dailyMemoryData.memoryIds || []), docRef.id]
    });
  }
  
  // Return the created memory
  return {
    id: parseInt(docRef.id),
    userId: parseInt(data.userId),
    relationshipId: data.relationshipId,
    type: data.type as MemoryType,
    content: data.content,
    caption: data.caption,
    imageUrl: imageUrl,
    createdAt: new Date(),
    thumbsUpCount: 0,
    isNew: true
  };
}

// React to a memory (thumbs up)
export async function reactToMemory(memoryId: string): Promise<void> {
  const memoryRef = doc(memoriesCollection, memoryId);
  const memoryDoc = await getDoc(memoryRef);
  
  if (!memoryDoc.exists()) {
    throw new Error("Memory not found");
  }
  
  const memoryData = memoryDoc.data() as FirestoreMemory;
  
  await updateDoc(memoryRef, {
    thumbsUpCount: (memoryData.thumbsUpCount || 0) + 1
  });
}

// Mark memories as not new (after they've been viewed)
export async function markMemoriesAsViewed(relationshipId: number): Promise<void> {
  const q = query(
    memoriesCollection,
    where("relationshipId", "==", relationshipId),
    where("isNew", "==", true)
  );
  
  const querySnapshot = await getDocs(q);
  
  const batch = firestore.batch();
  
  querySnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { isNew: false });
  });
  
  await batch.commit();
}

// Select random memories for the daily view
export async function selectRandomMemoriesForDay(relationshipId: number, count: number): Promise<Memory[]> {
  const q = query(
    memoriesCollection,
    where("relationshipId", "==", relationshipId),
    // Order by random field would be ideal here, but Firestore doesn't support it directly
    // Using createdAt as a proxy, though not truly random
    orderBy("createdAt")
  );
  
  const querySnapshot = await getDocs(q);
  const allMemories = querySnapshot.docs.map(convertToMemory);
  
  // If we have fewer memories than requested, return all of them
  if (allMemories.length <= count) {
    return allMemories;
  }
  
  // Otherwise, pick random memories
  const selectedMemories: Memory[] = [];
  const indices = new Set<number>();
  
  while (selectedMemories.length < count && selectedMemories.length < allMemories.length) {
    const index = Math.floor(Math.random() * allMemories.length);
    
    if (!indices.has(index)) {
      indices.add(index);
      selectedMemories.push(allMemories[index]);
    }
  }
  
  return selectedMemories;
}