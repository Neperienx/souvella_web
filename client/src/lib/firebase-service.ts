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
import { ref, uploadBytes, getDownloadURL, UploadResult } from "firebase/storage";
import { firestore, storage } from "./firebase";
import { MemoryType } from "@shared/schema";

// Collection references
const memoriesCollection = collection(firestore, "memories");
const dailyMemoriesCollection = collection(firestore, "dailyMemories");
const userReactionsCollection = collection(firestore, "userReactions");

// Interface for Firestore memory document
interface FirestoreMemory {
  userId: string;
  relationshipId: string; // Using string to match how it's stored in Firestore
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
  relationshipId: string; // Using string to match how it's stored in Firestore
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
  
  // Safe parsing of relationshipId from string to number
  let relationshipId: number;
  try {
    relationshipId = parseInt(data.relationshipId, 10);
    if (isNaN(relationshipId)) {
      console.warn(`Invalid relationshipId in Firestore document ${doc.id}: ${data.relationshipId}`);
      relationshipId = 0; // Default fallback value
    }
  } catch (e) {
    console.error(`Error parsing relationshipId in Firestore document ${doc.id}:`, e);
    relationshipId = 0; // Default fallback value
  }
  
  return {
    id: doc.id, // Keep ID as string to match Firebase document ID
    userId: data.userId, // Keep as string to match Firebase user ID
    relationshipId, // Now safely parsed to number
    type: data.type as MemoryType,
    content: data.content,
    createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
    thumbsUpCount: data.thumbsUpCount || 0,
    caption: data.caption || null,
    imageUrl: data.imageUrl || null,
    isNew: data.isNew || false
  };
}

// Get memories for a relationship
export async function getRelationshipMemories(relationshipId: number): Promise<Memory[]> {
  try {
    // Convert relationshipId to string for Firestore consistency
    const relationshipIdString = relationshipId.toString();
    
    // Using only a single filter to avoid index requirements
    const q = query(
      memoriesCollection,
      where("relationshipId", "==", relationshipIdString)
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
  try {
    // Convert relationshipId to string to match how it's stored
    const relationshipIdString = relationshipId.toString();
    
    console.log(`Fetching daily memories for relationship ${relationshipId} (${relationshipIdString})`);
    
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Formatted date strings for reliable comparison
    const todayString = formatDateForStorage(today);
    
    // Use a single where clause to avoid needing a composite index
    const dailyMemoryQuery = query(
      dailyMemoriesCollection,
      where("relationshipId", "==", relationshipIdString)
    );
    
    const querySnapshot = await getDocs(dailyMemoryQuery);
    
    // If no daily memories document exists at all, create one with initial memories
    if (querySnapshot.empty) {
      console.log(`No daily memories found for relationship ${relationshipId}. Will generate initial memories.`);
      
      // Select random memories for this relationship
      const randomMemories = await selectRandomMemoriesForDay(relationshipId, 4);
      console.log(`Generated ${randomMemories.length} random memories for initial daily view.`);
      
      // Create a daily memory document with the random memories
      if (randomMemories.length > 0) {
        const memoryIds = randomMemories.map(memory => memory.id);
        
        // Create a new document with today's date
        await addDoc(dailyMemoriesCollection, {
          relationshipId: relationshipIdString,
          memoryIds,
          date: serverTimestamp()
        });
        
        console.log(`Created new daily memories document with ${memoryIds.length} memories`);
        return randomMemories;
      }
      
      return []; // No memories available
    }
    
    // We have an existing daily memories document
    const dailyMemoryDoc = querySnapshot.docs[0];
    const dailyMemory = dailyMemoryDoc.data() as FirestoreDailyMemory;
    
    console.log(`Found daily memory document for relationship ${relationshipId}`);
    
    // Log the document for debugging
    console.log(`Daily memory document data:`, {
      relationshipId: dailyMemory.relationshipId,
      date: dailyMemory.date ? dailyMemory.date.toDate().toISOString() : 'No date',
      memoryIds: dailyMemory.memoryIds || [],
      memoryCount: dailyMemory.memoryIds ? dailyMemory.memoryIds.length : 0
    });
    
    // Check if we need to regenerate memories (only if the date is different from today)
    let shouldRegenerateMemories = false;
    let memoryDateString = todayString; // Default to today
    
    if (dailyMemory.date) {
      const memoryDate = dailyMemory.date.toDate();
      memoryDateString = formatDateForStorage(memoryDate);
      
      console.log(`Comparing memory date: ${memoryDateString} with today: ${todayString}`);
      
      // Only regenerate if the date is different (i.e., it's a new day)
      shouldRegenerateMemories = (memoryDateString !== todayString);
    }
    
    // If we need to regenerate, do so
    if (shouldRegenerateMemories) {
      console.log(`Daily memories are from ${memoryDateString}, which is different from today (${todayString}). Generating new memories.`);
      
      // Generate new memories
      const randomMemories = await regenerateDailyMemories(relationshipId, 4);
      console.log(`Generated ${randomMemories.length} new random memories for daily view.`);
      
      if (randomMemories.length > 0) {
        // Update the document with the new memory IDs AND the new date
        await updateDoc(dailyMemoryDoc.ref, {
          memoryIds: randomMemories.map(memory => memory.id),
          date: serverTimestamp()
        });
        
        console.log(`Updated daily memories document with ${randomMemories.length} memories and new date`);
        return randomMemories;
      }
      
      return []; // No memories available after regeneration
    }
    
    console.log(`Daily memories are already from today (${todayString}). Not regenerating.`);
    
    // If there are no memory IDs in the existing document, return empty array
    if (!dailyMemory.memoryIds || dailyMemory.memoryIds.length === 0) {
      console.log(`No memory IDs found in daily memory document.`);
      return [];
    }
    
    // Fetch the actual memory documents for the IDs we have
    const memories: Memory[] = [];
    
    for (const memoryId of dailyMemory.memoryIds) {
      console.log(`Fetching memory with ID: ${memoryId}`);
      const memoryDoc = await getDoc(doc(memoriesCollection, memoryId));
      
      if (memoryDoc.exists()) {
        const memory = convertToMemory(memoryDoc);
        memories.push(memory);
        console.log(`Memory found: ${memory.id}, type: ${memory.type}, thumbsUp: ${memory.thumbsUpCount}`);
      } else {
        console.log(`Memory ${memoryId} not found`);
      }
    }
    
    console.log(`Retrieved ${memories.length}/${dailyMemory.memoryIds.length} memories for daily view`);
    console.log(`Successfully retrieved ${memories.length} daily memories:`, memories.map(m => ({id: m.id, type: m.type, thumbsUp: m.thumbsUpCount})));
    
    return memories;
  } catch (error) {
    console.error("Error getting daily memories:", error);
    return []; // Return empty array in case of error
  }
}

// Regenerate daily memories (for reroll feature)
export async function regenerateDailyMemories(relationshipId: number, count: number = 4): Promise<Memory[]> {
  try {
    // Convert relationshipId to string for Firestore consistency
    const relationshipIdString = relationshipId.toString();
    
    console.log(`Regenerating daily memories for relationship ${relationshipId} (${relationshipIdString})`);
    
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // First, get all available memories for this relationship
    const q1 = query(
      memoriesCollection,
      where("relationshipId", "==", relationshipIdString)
    );
    
    const memoriesSnapshot = await getDocs(q1);
    
    if (memoriesSnapshot.empty) {
      console.log(`No memories found for relationship ${relationshipId}`);
      return [];
    }
    
    // Get today's date at midnight for comparison
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Filter out memories that were created today or have isNew flag
    const allMemories = memoriesSnapshot.docs
      .filter(doc => {
        const data = doc.data() as FirestoreMemory;
        
        // Skip if explicitly marked as new
        if (data.isNew === true) {
          return false;
        }
        
        // Skip if created today
        if (data.createdAt) {
          const createdDate = data.createdAt.toDate();
          return createdDate < todayStart; // Only include memories from before today
        }
        
        return true; // Include if it doesn't have a creation date
      })
      .map(convertToMemory);
    
    console.log(`Found ${memoriesSnapshot.docs.length} total memories, ${allMemories.length} non-new memories to select from`);
    
    // If we have fewer memories than requested, return all of them
    if (allMemories.length <= count) {
      console.log(`Fewer memories than requested count, returning all ${allMemories.length} memories`);
      
      // Get the memory IDs to store in daily memories
      const memoryIds = allMemories.map(memory => memory.id);
      
      // Get the existing daily memory document, if any
      const dailyMemQuery = query(
        dailyMemoriesCollection,
        where("relationshipId", "==", relationshipIdString)
      );
      
      const dailyMemSnapshot = await getDocs(dailyMemQuery);
      
      if (dailyMemSnapshot.empty) {
        // If no document exists, create a new one with the selected memories and today's date
        await addDoc(dailyMemoriesCollection, {
          relationshipId: relationshipIdString,
          memoryIds,
          date: serverTimestamp()
        });
        console.log(`Created new daily memories document with ${memoryIds.length} memories and current date`);
      } else {
        // Update the existing document with both memory IDs and today's date
        const dailyMemoryDoc = dailyMemSnapshot.docs[0];
        await updateDoc(dailyMemoryDoc.ref, {
          memoryIds,
          date: serverTimestamp() // Important: also update the date on fewer memories scenario
        });
        console.log(`Updated daily memories document with ${memoryIds.length} memories and refreshed date`);
      }
      
      return allMemories;
    }
    
    // Calculate weights for weighted random selection
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
    console.log("Memory weights sample:", weights.slice(0, 3).map((w, i) => ({
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
    while (selectedMemories.length < count && selectedIndices.size < allMemories.length) {
      const index = weightedRandom();
      
      if (index >= 0 && !selectedIndices.has(index)) {
        selectedIndices.add(index);
        selectedMemories.push(allMemories[index]);
        
        // Debug log
        console.log(`Selected memory ${allMemories[index].id} with ${allMemories[index].thumbsUpCount} thumbs up`);
      }
    }
    
    console.log(`Selected ${selectedMemories.length} memories for daily view`);
    
    // Get the memory IDs from the selected memories
    const memoryIds = selectedMemories.map(memory => memory.id);
    
    // Get the existing daily memory document, if any
    const dailyMemQuery = query(
      dailyMemoriesCollection,
      where("relationshipId", "==", relationshipIdString)
    );
    
    const dailyMemSnapshot = await getDocs(dailyMemQuery);
    
    if (dailyMemSnapshot.empty) {
      // If no document exists, create a new one with the selected memories and today's date
      await addDoc(dailyMemoriesCollection, {
        relationshipId: relationshipIdString,
        memoryIds,
        date: serverTimestamp()
      });
      console.log(`Created new daily memories document with ${memoryIds.length} memories and current date`);
    } else {
      // Update the existing document with both memory IDs and today's date
      const dailyMemoryDoc = dailyMemSnapshot.docs[0];
      await updateDoc(dailyMemoryDoc.ref, {
        memoryIds,
        date: serverTimestamp() // Important: also update the date on reroll
      });
      console.log(`Updated daily memories document with ${memoryIds.length} memories and refreshed date`);
    }
    
    return selectedMemories;
  } catch (error) {
    console.error("Error regenerating daily memories:", error);
    return [];
  }
}

// Helper function to update daily memories document with a new timestamp
async function updateDailyMemoryTimestamp(relationshipId: number): Promise<void> {
  try {
    // Convert relationshipId to string to match how it's stored in Firestore
    const relationshipIdString = relationshipId.toString();
    
    console.log(`Updating daily memory timestamp for relationship ${relationshipId} (${relationshipIdString})`);
    
    // Get the existing daily memory document, if any
    const q = query(
      dailyMemoriesCollection,
      where("relationshipId", "==", relationshipIdString)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Update the existing document with a new date
      const dailyMemoryDoc = querySnapshot.docs[0];
      await updateDoc(dailyMemoryDoc.ref, {
        date: serverTimestamp()
      });
      console.log(`Updated timestamp for daily memories document`);
    }
  } catch (error) {
    console.error("Error updating daily memory timestamp:", error);
  }
}

// Get newly added memories for a relationship
export async function getNewMemories(relationshipId: number): Promise<Memory[]> {
  try {
    // Convert relationshipId to string for Firestore consistency
    const relationshipIdString = relationshipId.toString();
    
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`Looking for new memories for relationship ${relationshipId} (${relationshipIdString})`);
    
    // Firestore requires an index for queries with multiple filters + orderBy
    // First get all memories for the relationship
    const q = query(
      memoriesCollection,
      where("relationshipId", "==", relationshipIdString)
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
    // Convert relationshipId to string for storage consistency  
    const relationshipIdString = data.relationshipId.toString();
    
    console.log("Creating memory with data:", {
      userId: data.userId,
      relationshipId: data.relationshipId,
      relationshipIdString,
      type: data.type,
      contentLength: data.content?.length,
      hasCaption: !!data.caption,
      hasFile: !!data.file,
      fileType: data.file ? data.file.type : 'none',
      fileSize: data.file ? `${Math.round(data.file.size / 1024)} KB` : '0'
    });
    
    let imageUrl = "";
    
    // Default the type to what was passed in
    let finalMemoryType = data.type;
    
    // If there's a file, upload it to Firebase Storage (both images and audio)
    if (data.file && (data.type === "image" || data.type === "audio")) {
      try {
        console.log(`UPLOAD DEBUG: Starting ${data.type} upload process`, {
          fileName: data.file.name,
          fileType: data.file.type,
          fileSize: `${Math.round(data.file.size / 1024)} KB`,
          path: `memories/${relationshipIdString}/${Date.now()}_${data.file.name}`
        });
        
        // Compress the image if it's large (> 1MB)
        let fileToUpload = data.file;
        if (data.file.size > 1024 * 1024) {
          console.log("UPLOAD DEBUG: File is large, would do compression in future...");
          // We'll use the original file for now as compression would require additional libraries
        }
        
        const timestamp = Date.now();
        const filename = `${timestamp}_${data.file.name}`;
        const filePath = `memories/${relationshipIdString}/${filename}`;
        
        console.log(`UPLOAD DEBUG: Creating Firebase storage reference to ${filePath}`);
        console.log(`UPLOAD DEBUG: Storage object:`, storage ? "Exists" : "Undefined");
        console.log(`UPLOAD DEBUG: Firebase config:`, {
          storageBucket: "memorybook2-4df48.firebasestorage.app",
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "Not set",
          region: "EUROPE-WEST3" // The region you specified
        });
        
        // Check if the Firebase Storage is properly configured
        if (!storage) {
          throw new Error("Firebase Storage is not initialized properly");
        }
        
        try {
          // Try getting the storage reference
          const storageRef = ref(storage, filePath);
          console.log("UPLOAD DEBUG: Storage reference created successfully", storageRef);
          
          // Set up a timeout promise for upload operation
          const uploadPromise = uploadBytes(storageRef, fileToUpload);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Upload timed out after 15 seconds")), 15000);
          });
          
          console.log("UPLOAD DEBUG: Beginning uploadBytes operation (with 15-second timeout)");
          // Race the upload against the timeout
          const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
          console.log("UPLOAD DEBUG: Upload completed successfully, details:", snapshot);
          
          console.log("UPLOAD DEBUG: Getting download URL");
          // Add a timeout to the getDownloadURL operation too
          const downloadUrlPromise = getDownloadURL(snapshot.ref);
          const downloadTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Get download URL timed out after 10 seconds")), 10000);
          });
          
          imageUrl = await Promise.race([downloadUrlPromise, downloadTimeoutPromise]) as string;
          console.log("UPLOAD DEBUG: Download URL obtained:", imageUrl ? imageUrl.substring(0, 50) + "..." : "No URL received");
        } catch (storageError) {
          console.error("UPLOAD DEBUG: Storage operation error:", storageError);
          if (storageError instanceof Error) {
            console.error("UPLOAD DEBUG: Error message:", storageError.message);
            console.error("UPLOAD DEBUG: Error name:", storageError.name);
            console.error("UPLOAD DEBUG: Error stack:", storageError.stack);
          }
          
          // Log additional storage diagnostics
          console.error("UPLOAD DEBUG: Storage bucket check:", storage?.app?.options?.storageBucket);
          
          throw storageError; // Re-throw to the outer catch block
        }
      } catch (uploadError) {
        console.error("UPLOAD DEBUG ERROR: Failed to upload file to Firebase Storage:", uploadError);
        // Log more details about the error
        if (uploadError instanceof Error) {
          console.error("UPLOAD DEBUG ERROR: Error message:", uploadError.message);
          console.error("UPLOAD DEBUG ERROR: Error stack:", uploadError.stack);
        }
        // If file upload fails, we'll continue with text-only memory
        console.log("UPLOAD DEBUG: Continuing with text-only memory");
        finalMemoryType = "text"; // Force to text if image upload fails
      }
    }
      
    // Create memory document with required fields only
    const memoryData: any = {
      userId: data.userId,
      relationshipId: relationshipIdString, // Store as string for consistency
      type: finalMemoryType, // Use the possibly updated type
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
    // This field is used for both image URLs and audio file URLs
    if (imageUrl && imageUrl.trim() !== '') {
      memoryData.imageUrl = imageUrl;
    }
    
    console.log("Adding document to Firestore with data:", Object.keys(memoryData));
    const docRef = await addDoc(memoriesCollection, memoryData);
    console.log("Document added successfully with ID:", docRef.id);
    
    // Note: We no longer automatically add new memories to the daily memories collection
    // New memories should only appear in the "Just added" section
    
    // Return the created memory
    return {
      id: docRef.id, // Keep ID as string to match Firebase document ID
      userId: data.userId, // Keep as string to match Firebase user ID
      relationshipId: data.relationshipId,
      type: finalMemoryType as MemoryType, // Use the possibly updated type
      content: (finalMemoryType === "image" || finalMemoryType === "audio") ? data.content : data.content,
      caption: data.caption || null,
      imageUrl: imageUrl || null, // For both image URLs and audio file URLs
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
// Function to check if a user has uploaded a memory to a relationship today
export async function getUserDailyUploadStatus(userId: string, relationshipId: number): Promise<{
  hasUploaded: boolean;
  todaysMemory?: Memory;
}> {
  try {
    // TEMPORARILY DISABLED FOR DEBUGGING: Always return false to allow unlimited uploads
    console.log("Daily upload limit temporarily disabled for debugging");
    return {
      hasUploaded: false
    };
    
    // Original implementation (commented out):
    /*
    // Convert relationshipId to string for Firestore consistency
    const relationshipIdString = relationshipId.toString();
    
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // First get all memories for this relationship
    const q = query(
      memoriesCollection,
      where("relationshipId", "==", relationshipIdString)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Filter to find if this user has already uploaded a memory today
    for (const doc of querySnapshot.docs) {
      const memory = convertToMemory(doc);
      
      // Check if memory is from today and from this user
      if (memory.userId === userId && memory.createdAt >= today) {
        return {
          hasUploaded: true,
          todaysMemory: memory
        };
      }
    }
    
    // No upload found for today
    return {
      hasUploaded: false
    };
    */
  } catch (error) {
    console.error("Error checking daily upload status:", error);
    return {
      hasUploaded: false
    }; 
  }
}

export async function getUserRemainingThumbsUp(userId: string): Promise<number> {
  try {
    const MAX_DAILY_THUMBS_UP = 2;
    const today = formatDateForStorage(new Date());
    
    // For this case, we need a composite index on userReactionsCollection (userId + date)
    // This specific query is needed for functionality and can't be simplified further
    // Firebase will show a link to create this index if it doesn't exist
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
    // Convert relationshipId to string for Firestore consistency
    const relationshipIdString = relationshipId.toString();
    
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`Marking memories as viewed for relationship ${relationshipId} (${relationshipIdString})`);
    
    // Only query by relationshipId to avoid index requirement
    const q = query(
      memoriesCollection,
      where("relationshipId", "==", relationshipIdString)
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
export async function selectRandomMemoriesForDay(relationshipId: number, count: number = 4): Promise<Memory[]> {
  try {
    // Convert relationshipId to string for consistency
    const relationshipIdString = relationshipId.toString();
    
    console.log(`Selecting random memories for relationship ${relationshipId} (${relationshipIdString})`);
    
    // Use only a single where condition to avoid index requirements
    // Using the string version for Firebase consistency
    const q = query(
      memoriesCollection,
      where("relationshipId", "==", relationshipIdString)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter out memories that were created today or have isNew flag
    const allMemories = querySnapshot.docs
      .filter(doc => {
        const data = doc.data() as FirestoreMemory;
        
        // Skip if explicitly marked as new
        if (data.isNew === true) {
          return false;
        }
        
        // Skip if created today
        if (data.createdAt) {
          const createdDate = data.createdAt.toDate();
          return createdDate < today; // Only include memories from before today
        }
        
        return true; // Include if it doesn't have a creation date
      })
      .map(convertToMemory);
    
    // Debug log
    console.log(`Found ${allMemories.length} non-new memories for relationship ${relationshipId}`);
    
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