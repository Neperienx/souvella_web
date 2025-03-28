import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDoc,
  Timestamp,
  QueryDocumentSnapshot,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { firestore } from "./firebase";
import { Relationship, UserRelationship } from "@shared/schema";

// Collection references
const relationshipsCollection = collection(firestore, "relationships");
const userRelationshipsCollection = collection(firestore, "userRelationships");

// Interface for Firestore relationship document
interface FirestoreRelationship {
  name?: string;
  inviteCode: string;
  createdAt: Timestamp;
}

interface FirestoreUserRelationship {
  userId: string;
  relationshipId: string;
  nickname?: string; // User's nickname in this relationship
  createdAt: Timestamp;
}

// Generate a random invite code
function generateInviteCode(length = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Convert Firestore document to Relationship type
function convertToRelationship(doc: QueryDocumentSnapshot): Relationship {
  const data = doc.data() as FirestoreRelationship;
  // Use a safer way to convert IDs to numbers
  const id = Number(doc.id);
  return {
    id: isNaN(id) ? 0 : id, // Use a default value if conversion fails
    name: data.name || null,
    inviteCode: data.inviteCode,
    createdAt: data.createdAt?.toDate() || new Date() // Handle potentially missing timestamp
  };
}

// Get relationship by ID
export async function getRelationshipById(id: number): Promise<Relationship | null> {
  try {
    const docRef = doc(relationshipsCollection, id.toString());
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return convertToRelationship(docSnap);
    }
    
    return null;
  } catch (error) {
    console.error("Error getting relationship by ID:", error);
    throw error;
  }
}

// Get relationship by invite code
export async function getRelationshipByInviteCode(code: string): Promise<Relationship | null> {
  try {
    console.log("Getting relationship with invite code:", code);
    
    if (!code || code.trim() === "") {
      console.error("Invalid invite code provided");
      return null;
    }
    
    const q = query(
      relationshipsCollection, 
      where("inviteCode", "==", code.trim())
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("No relationship found with invite code:", code);
      return null;
    }
    
    console.log("Found relationship with invite code");
    const relationship = convertToRelationship(querySnapshot.docs[0]);
    console.log("Relationship details:", relationship);
    
    return relationship;
  } catch (error) {
    console.error("Error getting relationship by invite code:", error);
    throw error;
  }
}

// Get user's relationships
export async function getUserRelationships(userId: string): Promise<Relationship[]> {
  try {
    console.log("Getting relationships for user", userId);
    
    // First get all userRelationship documents for this user
    const q = query(
      userRelationshipsCollection,
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("No relationships found for user");
      return [];
    }
    
    console.log(`Found ${querySnapshot.docs.length} user relationship records`);
    
    // Get all relationships
    const relationships: Relationship[] = [];
    
    // Track user relationships that need cleanup
    const invalidUserRelationships: string[] = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const userData = docSnapshot.data() as FirestoreUserRelationship;
      console.log("User relationship data:", userData);
      
      if (!userData.relationshipId) {
        console.warn("Relationship ID is missing in user relationship document");
        invalidUserRelationships.push(docSnapshot.id);
        continue;
      }
      
      // Skip invalid relationship IDs like "NaN"
      if (userData.relationshipId === "NaN" || isNaN(Number(userData.relationshipId))) {
        console.warn(`Invalid relationship ID: ${userData.relationshipId}. Skipping.`);
        invalidUserRelationships.push(docSnapshot.id);
        continue;
      }
      
      console.log("Fetching relationship with ID:", userData.relationshipId);
      const relationshipDoc = await getDoc(doc(relationshipsCollection, userData.relationshipId));
      
      if (relationshipDoc.exists()) {
        relationships.push(convertToRelationship(relationshipDoc));
      } else {
        console.warn(`Relationship with ID ${userData.relationshipId} not found in Firestore`);
        invalidUserRelationships.push(docSnapshot.id);
      }
    }
    
    // Clean up invalid user relationships if found
    if (invalidUserRelationships.length > 0) {
      console.log(`Found ${invalidUserRelationships.length} invalid user relationships. Cleaning up...`);
      
      for (const docId of invalidUserRelationships) {
        try {
          // Delete the invalid user relationship record
          const docRef = doc(userRelationshipsCollection, docId);
          await deleteDoc(docRef);
          console.log(`Deleted invalid user relationship: ${docId}`);
        } catch (error) {
          console.error(`Failed to delete invalid user relationship: ${docId}`, error);
        }
      }
    }
    
    console.log(`Returning ${relationships.length} relationships`);
    return relationships;
  } catch (error) {
    console.error("Error getting user relationships:", error);
    throw error;
  }
}

// Create a new relationship
export async function createRelationship(name?: string): Promise<Relationship> {
  try {
    const inviteCode = generateInviteCode();
    
    // Generate a numeric ID instead of relying on Firestore's document ID
    const now = new Date();
    const numericId = Math.floor(now.getTime() / 1000); // Unix timestamp in seconds
    
    console.log("Creating relationship with generated ID:", numericId, "and name:", name);
    
    // Add document with custom ID
    await setDoc(doc(relationshipsCollection, numericId.toString()), {
      name: name || null,
      inviteCode,
      createdAt: serverTimestamp()
    });
    
    // Return a properly formed relationship object
    return {
      id: numericId,
      name: name || null,
      inviteCode,
      createdAt: now
    };
  } catch (error) {
    console.error("Error creating relationship:", error);
    throw error;
  }
}

// Add user to relationship
export async function addUserToRelationship(userId: string, relationshipId: number): Promise<Relationship> {
  try {
    console.log("Adding user", userId, "to relationship", relationshipId);
    
    // First verify the relationship exists
    let relationship = await getRelationshipById(relationshipId);
    if (!relationship) {
      console.error("Relationship not found with ID:", relationshipId);
      throw new Error(`Relationship not found with ID: ${relationshipId}`);
    }
    
    // Check if user is already in this relationship
    const q = query(
      userRelationshipsCollection,
      where("userId", "==", userId),
      where("relationshipId", "==", relationshipId.toString())
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // User is already in this relationship, just return the relationship
      console.log("User is already in this relationship");
      return relationship;
    }
    
    // Add user to relationship
    await addDoc(userRelationshipsCollection, {
      userId,
      relationshipId: relationshipId.toString(),
      createdAt: serverTimestamp()
    });
    
    console.log("User successfully added to relationship");
    
    // Just return the relationship we already verified exists
    return relationship;
  } catch (error) {
    console.error("Error adding user to relationship:", error);
    throw error;
  }
}

// Get user's primary relationship
export async function getUserPrimaryRelationship(userId: string): Promise<Relationship | null> {
  try {
    const relationships = await getUserRelationships(userId);
    
    if (relationships.length === 0) {
      return null;
    }
    
    // Return the most recently created relationship as the primary one
    return relationships.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  } catch (error) {
    console.error("Error getting user's primary relationship:", error);
    throw error;
  }
}

// Get a user's nickname in a specific relationship
export async function getUserNickname(userId: string, relationshipId: number): Promise<string | null> {
  try {
    // Convert relationshipId to string for consistency
    const relationshipIdString = relationshipId.toString();
    
    console.log(`Getting nickname for user ${userId} in relationship ${relationshipId}`);
    
    const q = query(
      userRelationshipsCollection,
      where("userId", "==", userId),
      where("relationshipId", "==", relationshipIdString)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("No user relationship found");
      return null;
    }
    
    const data = querySnapshot.docs[0].data() as FirestoreUserRelationship;
    return data.nickname || null;
  } catch (error) {
    console.error("Error getting user nickname:", error);
    return null;
  }
}

// Update a relationship's name
export async function updateRelationshipName(
  relationshipId: number,
  name: string
): Promise<Relationship | null> {
  try {
    console.log(`Updating name for relationship ${relationshipId} to: ${name}`);
    
    const relationshipIdString = relationshipId.toString();
    const docRef = doc(relationshipsCollection, relationshipIdString);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.error("Relationship not found with ID:", relationshipId);
      return null;
    }
    
    // Update the name
    await updateDoc(docRef, { name });
    
    console.log("Relationship name updated successfully");
    
    // Get the updated relationship
    const updatedDocSnap = await getDoc(docRef);
    
    if (!updatedDocSnap.exists()) {
      console.error("Failed to retrieve updated relationship");
      return null;
    }
    
    // Create a modified relationship object manually
    const data = updatedDocSnap.data() as FirestoreRelationship;
    const id = Number(updatedDocSnap.id);
    return {
      id: isNaN(id) ? 0 : id,
      name: data.name || null,
      inviteCode: data.inviteCode,
      createdAt: data.createdAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error("Error updating relationship name:", error);
    return null;
  }
}

// Update a user's nickname in a relationship
export async function updateUserNickname(
  userId: string, 
  relationshipId: number, 
  nickname: string
): Promise<boolean> {
  try {
    // Convert relationshipId to string for consistency
    const relationshipIdString = relationshipId.toString();
    
    console.log(`Updating nickname for user ${userId} in relationship ${relationshipId} to: ${nickname}`);
    
    // Find the user relationship document
    const q = query(
      userRelationshipsCollection,
      where("userId", "==", userId),
      where("relationshipId", "==", relationshipIdString)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.error("No user relationship found to update nickname");
      return false;
    }
    
    // Update the nickname
    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, { nickname });
    
    console.log("Nickname updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating user nickname:", error);
    return false;
  }
}