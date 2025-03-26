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
  return {
    id: parseInt(doc.id),
    inviteCode: data.inviteCode,
    createdAt: data.createdAt.toDate()
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
    // First get all userRelationship documents for this user
    const q = query(
      userRelationshipsCollection,
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return [];
    }
    
    // Extract relationship IDs
    const relationshipIds = querySnapshot.docs.map(doc => 
      (doc.data() as FirestoreUserRelationship).relationshipId
    );
    
    // Get all relationships
    const relationships: Relationship[] = [];
    
    for (const relationshipId of relationshipIds) {
      const relationshipDoc = await getDoc(doc(relationshipsCollection, relationshipId));
      
      if (relationshipDoc.exists()) {
        relationships.push(convertToRelationship(relationshipDoc));
      }
    }
    
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
    
    return {
      id: parseInt(docRef.id),
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
    // Check if user is already in this relationship
    const q = query(
      userRelationshipsCollection,
      where("userId", "==", userId),
      where("relationshipId", "==", relationshipId.toString())
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // User is already in this relationship
      // Return the relationship
      const relationship = await getRelationshipById(relationshipId);
      if (!relationship) {
        throw new Error("Relationship not found");
      }
      return relationship;
    }
    
    // Add user to relationship
    await addDoc(userRelationshipsCollection, {
      userId,
      relationshipId: relationshipId.toString(),
      createdAt: serverTimestamp()
    });
    
    // Return the relationship
    const relationship = await getRelationshipById(relationshipId);
    if (!relationship) {
      throw new Error("Relationship not found");
    }
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