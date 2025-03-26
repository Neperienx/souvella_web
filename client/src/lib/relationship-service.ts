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
  QueryDocumentSnapshot
} from "firebase/firestore";
import { firestore } from "./firebase";
import { Relationship, UserRelationship } from "@shared/schema";

// Collection references
const relationshipsCollection = collection(firestore, "relationships");
const userRelationshipsCollection = collection(firestore, "userRelationships");

// Interface for Firestore relationship document
interface FirestoreRelationship {
  inviteCode: string;
  createdAt: Timestamp;
}

interface FirestoreUserRelationship {
  userId: string;
  relationshipId: string;
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
    const q = query(
      relationshipsCollection, 
      where("inviteCode", "==", code)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return convertToRelationship(querySnapshot.docs[0]);
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
    
    // Extract relationship IDs
    const relationshipIds = querySnapshot.docs.map(doc => 
      (doc.data() as FirestoreUserRelationship).relationshipId
    );
    
    // Get all relationships
    const relationships: Relationship[] = [];
    
    for (const relationshipId of relationshipIds) {
      console.log("Fetching relationship with ID:", relationshipId);
      const relationshipDoc = await getDoc(doc(relationshipsCollection, relationshipId));
      
      if (relationshipDoc.exists()) {
        relationships.push(convertToRelationship(relationshipDoc));
      } else {
        console.warn(`Relationship with ID ${relationshipId} not found in Firestore`);
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
export async function createRelationship(): Promise<Relationship> {
  try {
    const inviteCode = generateInviteCode();
    
    const relationshipData = {
      inviteCode,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(relationshipsCollection, relationshipData);
    
    // Safe ID conversion with fallback
    const id = Number(docRef.id);
    
    return {
      id: isNaN(id) ? 0 : id,
      inviteCode,
      createdAt: new Date()
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