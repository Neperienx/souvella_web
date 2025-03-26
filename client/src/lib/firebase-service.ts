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
  writeBatch,
  increment
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "./firebase";
import { MemoryType } from "@shared/schema";

// Collection references
const memoriesCollection = collection(firestore, "memories");
const dailyMemoriesCollection = collection(firestore, "dailyMemories");
const userReactionsCollection = collection(firestore, "userReactions");

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

// Custom Memory type for Firestore compatibility with string IDs
export interface Memory {
  id: string;
  userId: string;
  relationshipId: number;
  type: MemoryType;
  content: string;
  caption: string | null;
  imageUrl: string | null;
  createdAt: Date;
  thumbsUpCount: number;
  isNew: boolean;
}

interface FirestoreDailyMemory {
  relationshipId: number;
  memoryIds: string[];
  date: Timestamp;
}

// Interface for tracking user reactions (thumbs up)
interface UserReaction {
  userId: string;
  memoryId: string;
  createdAt: Timestamp;
  date: string; // YYYY-MM-DD format for easier querying by day
}

// Convert Firestore document to Memory type
function convertToMemory(doc: QueryDocumentSnapshot): Memory {
  const data = doc.data() as FirestoreMemory;
  return {
    id: doc.id, // Keep ID as string to match Firebase document ID
    userId: data.userId, // Keep as string to match Firebase user ID
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
  try {
    // Using only a single filter to avoid index requirements
    const q = query(
      memoriesCollection,
      where("relationshipId", "==", relationshipId)
    );

    const querySnapshot = await getDocs(q);
    
    // Sort client-side by creation date (descending)
    const memories = querySnapshot.docs
      .map(convertToMemory)
      .sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
    return memories;
  } catch (error) {
    console.error("Error getting relationship memories:", error);
    return []; // Return empty array in case of error
  }
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

// Regenerate daily memories (for reroll feature)
export async function regenerateDailyMemories(relationshipId: number, count: number = 3): Promise<Memory[]> {
  try {
    console.log(`Regenerating daily memories for relationship ${relationshipId}`);
    
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // First, select new random memories using the weighted algorithm
    const newMemories = await selectRandomMemoriesForDay(relationshipId, count);
    console.log(`Selected ${newMemories.length} new memories for daily reroll`);
    
    // Get the existing daily memory document, if any
    const q = query(
      dailyMemoriesCollection,
      where("relationshipId", "==", relationshipId),
      where("date", ">=", today)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Get the memory IDs from the selected memories
    const memoryIds = newMemories.map(memory => memory.id);
    
    if (querySnapshot.empty) {
      // If no daily memories exist for today, create a new one
      await addDoc(dailyMemoriesCollection, {
        relationshipId,
        memoryIds,
        date: serverTimestamp()
      });
      console.log(`Created new daily memories document with ${memoryIds.length} memories`);
    } else {
      // Update the existing document
      const dailyMemoryDoc = querySnapshot.docs[0];
      await updateDoc(dailyMemoryDoc.ref, {
        memoryIds
      });
      console.log(`Updated existing daily memories document with ${memoryIds.length} memories`);
    }
    
    return newMemories;
  } catch (error) {
    console.error("Error regenerating daily memories:", error);
    return [];
  }
}

// Get newly added memories for a relationship
export async function getNewMemories(relationshipId: number): Promise<Memory[]> {
  try {
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Firestore requires an index for queries with multiple filters + orderBy
    // First get all memories for the relationship
    const q = query(
      memoriesCollection,
      where("relationshipId", "==", relationshipId)
    );

    const querySnapshot = await getDocs(q);
    
    // Then filter by isNew flag or created today, and sort client-side
    const newMemories = querySnapshot.docs
      .filter(doc => {
        const data = doc.data() as FirestoreMemory;
        
        // Include if explicitly marked as new
        if (data.isNew === true) {
          return true;
        }
        
        // Or include if created today (even if not marked as new)
        if (data.createdAt) {
          const createdDate = data.createdAt.toDate();
          return createdDate >= today;
        }
        
        return false;
      })
      .map(convertToMemory)
      .sort((a, b) => {
        // Sort descending by creation date
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    
    console.log(`Found ${newMemories.length} new memories for relationship ${relationshipId}`);
    return newMemories;
  } catch (error) {
    console.error("Error getting new memories:", error);
    return []; // Return empty array in case of error
  }
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
  try {
    console.log("Creating memory with data:", {
      userId: data.userId,
      relationshipId: data.relationshipId,
      type: data.type,
      contentLength: data.content?.length,
      hasCaption: !!data.caption,
      hasFile: !!data.file
    });
    
    let imageUrl = "";
    
    // If there's a file, upload it to Firebase Storage
    if (data.file && data.type === "image") {
      console.log("Uploading file to Firebase Storage");
      const storageRef = ref(storage, `memories/${data.relationshipId}/${Date.now()}_${data.file.name}`);
      const snapshot = await uploadBytes(storageRef, data.file);
      imageUrl = await getDownloadURL(snapshot.ref);
      console.log("File uploaded successfully, image URL obtained");
    }
    
    // Create memory document with required fields only
    const memoryData: any = {
      userId: data.userId,
      relationshipId: data.relationshipId,
      type: data.type,
      content: data.content || "",
      createdAt: serverTimestamp(),
      thumbsUpCount: 0,
      isNew: true
    };
    
    // Only add caption if it exists and is not empty
    if (data.caption && data.caption.trim() !== '') {
      memoryData.caption = data.caption;
    }
    
    // Only add imageUrl if it exists and is not empty
    if (imageUrl && imageUrl.trim() !== '') {
      memoryData.imageUrl = imageUrl;
    }
    
    console.log("Adding document to Firestore with data:", Object.keys(memoryData));
    const docRef = await addDoc(memoriesCollection, memoryData);
    console.log("Document added successfully with ID:", docRef.id);
    
    // Create a daily memory record if it doesn't exist
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyMemoryQuery = query(
      dailyMemoriesCollection,
      where("relationshipId", "==", data.relationshipId),
      where("date", ">=", today)
    );
    
    const dailyMemorySnapshot = await getDocs(dailyMemoryQuery);
    
    try {
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
    } catch (error) {
      console.error("Error creating/updating daily memory:", error);
      // Continue execution even if daily memory creation fails
    }
    
    // Return the created memory
    return {
      id: docRef.id, // Keep ID as string to match Firebase document ID
      userId: data.userId, // Keep as string to match Firebase user ID
      relationshipId: data.relationshipId,
      type: data.type as MemoryType,
      content: data.type === "image" && imageUrl ? imageUrl : data.content,
      caption: data.caption || null,
      imageUrl: imageUrl || null,
      createdAt: new Date(),
      thumbsUpCount: 0,
      isNew: true
    };
    
  } catch (error) {
    console.error("Error creating memory:", error);
    throw error;
  }
}

// Helper function to format date as YYYY-MM-DD
function formatDateForStorage(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Get user's remaining thumbs up count for today
export async function getUserRemainingThumbsUp(userId: string): Promise<number> {
  try {
    const MAX_DAILY_THUMBS_UP = 2;
    const today = formatDateForStorage(new Date());
    
    // Query reactions from today for this user
    const q = query(
      userReactionsCollection,
      where("userId", "==", userId),
      where("date", "==", today)
    );
    
    const querySnapshot = await getDocs(q);
    const usedCount = querySnapshot.size;
    
    const remaining = Math.max(0, MAX_DAILY_THUMBS_UP - usedCount);
    console.log(`User ${userId} has used ${usedCount} thumbs up today. Remaining: ${remaining}`);
    
    return remaining;
  } catch (error) {
    console.error("Error checking remaining thumbs up:", error);
    return 0; // Default to 0 in case of error to prevent further reactions
  }
}

// React to a memory (thumbs up) with daily limit
export async function reactToMemory(memoryId: string, userId: string): Promise<{ success: boolean, message: string }> {
  try {
    // Check if user has thumbs up remaining today
    const remainingThumbsUp = await getUserRemainingThumbsUp(userId);
    
    if (remainingThumbsUp <= 0) {
      return { 
        success: false, 
        message: "You've used all your thumbs up for today!" 
      };
    }
    
    // Get the memory document
    const memoryRef = doc(memoriesCollection, memoryId);
    const memoryDoc = await getDoc(memoryRef);
    
    if (!memoryDoc.exists()) {
      return { 
        success: false, 
        message: "Memory not found" 
      };
    }
    
    // Get today's date for the reaction record
    const today = new Date();
    const dateString = formatDateForStorage(today);
    
    // Create a new reaction document
    await addDoc(userReactionsCollection, {
      userId,
      memoryId,
      createdAt: serverTimestamp(),
      date: dateString
    });
    
    // Increment the memory's thumbs up count
    await updateDoc(memoryRef, {
      thumbsUpCount: increment(1)
    });
    
    return { 
      success: true, 
      message: `Thumbs up added! You have ${remainingThumbsUp - 1} left today.` 
    };
  } catch (error) {
    console.error("Error adding thumbs up:", error);
    return { 
      success: false, 
      message: "An error occurred while adding your thumbs up" 
    };
  }
}

// Mark memories as not new only if they weren't created today
export async function markMemoriesAsViewed(relationshipId: number): Promise<void> {
  try {
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only query by relationshipId to avoid index requirement
    const q = query(
      memoriesCollection,
      where("relationshipId", "==", relationshipId)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Filter documents client-side to find those that should be marked as "not new"
    // Only mark as "not new" if they weren't created today and are currently marked as "new"
    const memoriesToUpdate = querySnapshot.docs.filter(doc => {
      const data = doc.data() as FirestoreMemory;
      
      // Skip if it's not marked as new
      if (data.isNew !== true) {
        return false;
      }
      
      // If there's no createdAt timestamp, skip it
      if (!data.createdAt) {
        return false;
      }
      
      // Convert Firestore timestamp to Date
      const createdDate = data.createdAt.toDate();
      
      // Keep as "new" if created today, otherwise mark as "not new"
      const createdToday = createdDate >= today;
      
      // Only include it for update if it should be marked as NOT new
      // (created before today but still has isNew=true)
      return !createdToday;
    });
    
    // If there are no memories to update, return early
    if (memoriesToUpdate.length === 0) {
      console.log("No memories need to be marked as 'not new'");
      return;
    }
    
    // Update older memories (not created today) in a batch
    const batch = writeBatch(firestore);
    
    memoriesToUpdate.forEach((document) => {
      batch.update(document.ref, { isNew: false });
    });
    
    await batch.commit();
    console.log(`Marked ${memoriesToUpdate.length} memories as viewed (not created today)`);
  } catch (error) {
    console.error("Error marking memories as viewed:", error);
  }
}

// Select random memories for the daily view with weighted probabilities based on thumbs up
export async function selectRandomMemoriesForDay(relationshipId: number, count: number = 3): Promise<Memory[]> {
  try {
    // Use only a single where condition to avoid index requirements
    const q = query(
      memoriesCollection,
      where("relationshipId", "==", relationshipId)
    );
    
    const querySnapshot = await getDocs(q);
    const allMemories = querySnapshot.docs.map(convertToMemory);
    
    // Debug log
    console.log(`Found ${allMemories.length} memories for relationship ${relationshipId}`);
    
    // If we have fewer memories than requested, return all of them
    if (allMemories.length <= count) {
      console.log("Fewer memories than requested count, returning all memories");
      return allMemories;
    }
    
    // Calculate weights for each memory based on thumbs up count
    const weights: number[] = [];
    let totalWeight = 0;
    let totalThumbsUp = 0;
    
    // Calculate total thumbs up across all memories
    allMemories.forEach(memory => {
      totalThumbsUp += memory.thumbsUpCount;
    });
    
    // Calculate probability weight for each memory
    // Weight = (1 + thumbsUpCount) / (total memories + total thumbs up)
    allMemories.forEach(memory => {
      const weight = (1 + memory.thumbsUpCount) / (allMemories.length + totalThumbsUp);
      weights.push(weight);
      totalWeight += weight;
    });
    
    // Debug log the weights
    console.log("Memory weights:", weights.map((w, i) => ({
      id: allMemories[i].id,
      thumbsUp: allMemories[i].thumbsUpCount,
      weight: w
    })));
    
    // Select memories using weighted probabilities
    const selectedMemories: Memory[] = [];
    const selectedIndices = new Set<number>();
    
    // Helper function for weighted random selection
    const weightedRandom = () => {
      let randomValue = Math.random() * totalWeight;
      
      for (let i = 0; i < weights.length; i++) {
        if (!selectedIndices.has(i)) {  // Skip already selected indices
          randomValue -= weights[i];
          if (randomValue <= 0) {
            return i;
          }
        }
      }
      
      // Fallback - find first unselected memory
      for (let i = 0; i < allMemories.length; i++) {
        if (!selectedIndices.has(i)) {
          return i;
        }
      }
      
      return -1; // Should never reach here if count <= allMemories.length
    };
    
    // Select memories
    while (selectedMemories.length < count && selectedMemories.length < allMemories.length) {
      const index = weightedRandom();
      
      if (index >= 0 && !selectedIndices.has(index)) {
        selectedIndices.add(index);
        selectedMemories.push(allMemories[index]);
        
        // Debug log
        console.log(`Selected memory ${allMemories[index].id} with ${allMemories[index].thumbsUpCount} thumbs up`);
      }
    }
    
    console.log(`Selected ${selectedMemories.length} memories for daily view`);
    return selectedMemories;
  } catch (error) {
    console.error("Error selecting random memories:", error);
    return []; // Return empty array in case of error
  }
}