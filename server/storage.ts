import { 
  users, type User, type InsertUser,
  relationships, type Relationship, type InsertRelationship,
  userRelationships, type UserRelationship, type InsertUserRelationship,
  memories, type Memory, type InsertMemory,
  dailyMemories, type DailyMemory, type InsertDailyMemory,
  MemoryType
} from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations
  getUserByUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Relationship operations
  getRelationshipById(id: number): Promise<Relationship | undefined>;
  getRelationshipByInviteCode(code: string): Promise<Relationship | undefined>;
  getUserRelationship(userId: number): Promise<Relationship | undefined>;
  getUserRelationships(userId: number): Promise<Relationship[]>;
  createRelationship(name?: string): Promise<Relationship>;
  updateRelationshipName(id: number, name: string): Promise<Relationship | undefined>;
  addUserToRelationship(userId: number, relationshipId: number): Promise<UserRelationship>;

  // Memory operations
  getMemoriesByRelationship(relationshipId: number): Promise<Memory[]>;
  getMemoriesByUser(userId: number): Promise<Memory[]>;
  getMemoriesByUserAndDate(userId: number, date: Date): Promise<Memory[]>;
  createMemory(memory: InsertMemory): Promise<Memory>;
  incrementThumbsUp(memoryId: number): Promise<Memory>;
  
  // Daily memory operations
  getDailyMemoriesByRelationshipAndDate(relationshipId: number, date: Date): Promise<Memory[]>;
  createDailyMemory(dailyMemory: InsertDailyMemory): Promise<DailyMemory>;
  selectRandomMemoriesForDay(relationshipId: number, count: number): Promise<Memory[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private relationships: Map<number, Relationship>;
  private userRelationships: Map<number, UserRelationship>;
  private memories: Map<number, Memory>;
  private dailyMemories: Map<number, DailyMemory>;
  private currentId: { 
    user: number; 
    relationship: number; 
    userRelationship: number; 
    memory: number; 
    dailyMemory: number;
  };

  constructor() {
    this.users = new Map();
    this.relationships = new Map();
    this.userRelationships = new Map();
    this.memories = new Map();
    this.dailyMemories = new Map();
    this.currentId = {
      user: 1,
      relationship: 1,
      userRelationship: 1,
      memory: 1,
      dailyMemory: 1
    };
  }

  // User operations
  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.uid === uid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.user++;
    // Ensure photoURL is never undefined (convert to null if needed)
    const photoURL = insertUser.photoURL === undefined ? null : insertUser.photoURL;
    const user: User = { ...insertUser, id, photoURL };
    this.users.set(id, user);
    return user;
  }

  // Relationship operations
  async getRelationshipById(id: number): Promise<Relationship | undefined> {
    return this.relationships.get(id);
  }

  async getRelationshipByInviteCode(code: string): Promise<Relationship | undefined> {
    return Array.from(this.relationships.values()).find(
      (relationship) => relationship.inviteCode === code
    );
  }

  async getUserRelationship(userId: number): Promise<Relationship | undefined> {
    // Find the user relationship
    const userRelationship = Array.from(this.userRelationships.values()).find(
      (ur) => ur.userId === userId
    );

    if (!userRelationship) {
      return undefined;
    }

    // Return the associated relationship
    return this.relationships.get(userRelationship.relationshipId);
  }
  
  async getUserRelationships(userId: number): Promise<Relationship[]> {
    // Find all relationships for this user
    const userRelationshipIds = Array.from(this.userRelationships.values())
      .filter(ur => ur.userId === userId)
      .map(ur => ur.relationshipId);
    
    // Get the relationship objects
    const relationships: Relationship[] = [];
    for (const relationshipId of userRelationshipIds) {
      const relationship = this.relationships.get(relationshipId);
      if (relationship) {
        relationships.push(relationship);
      }
    }
    
    return relationships;
  }

  async createRelationship(name?: string): Promise<Relationship> {
    const id = this.currentId.relationship++;
    const inviteCode = nanoid(10);
    const createdAt = new Date();
    
    const relationship: Relationship = { id, inviteCode, createdAt, name: name || null };
    this.relationships.set(id, relationship);
    
    return relationship;
  }
  
  async updateRelationshipName(id: number, name: string): Promise<Relationship | undefined> {
    const relationship = this.relationships.get(id);
    
    if (!relationship) {
      return undefined;
    }
    
    const updatedRelationship = { ...relationship, name };
    this.relationships.set(id, updatedRelationship);
    return updatedRelationship;
  }

  async addUserToRelationship(userId: number, relationshipId: number): Promise<UserRelationship> {
    const id = this.currentId.userRelationship++;
    
    const userRelationship: UserRelationship = { 
      id, 
      userId, 
      relationshipId 
    };
    
    this.userRelationships.set(id, userRelationship);
    
    return userRelationship;
  }

  // Memory operations
  async getMemoriesByRelationship(relationshipId: number): Promise<Memory[]> {
    return Array.from(this.memories.values()).filter(
      (memory) => memory.relationshipId === relationshipId
    );
  }

  async getMemoriesByUser(userId: number): Promise<Memory[]> {
    return Array.from(this.memories.values()).filter(
      (memory) => memory.userId === userId
    );
  }

  async getMemoriesByUserAndDate(userId: number, date: Date): Promise<Memory[]> {
    // Format date to compare only year, month, day
    const dateString = date.toISOString().split('T')[0];
    
    return Array.from(this.memories.values()).filter(memory => {
      const memoryDate = new Date(memory.createdAt).toISOString().split('T')[0];
      return memory.userId === userId && memoryDate === dateString;
    });
  }

  async createMemory(insertMemory: InsertMemory): Promise<Memory> {
    const id = this.currentId.memory++;
    const createdAt = new Date();
    const thumbsUpCount = 0;
    
    // Create a properly typed memory object
    const memory: Memory = { 
      id, 
      userId: insertMemory.userId, 
      relationshipId: insertMemory.relationshipId,
      type: insertMemory.type,
      content: insertMemory.content,
      createdAt, 
      caption: insertMemory.caption ?? null,
      imageUrl: insertMemory.imageUrl ?? null,
      thumbsUpCount,
      isNew: insertMemory.isNew ?? true
    };
    
    this.memories.set(id, memory);
    
    return memory;
  }

  async incrementThumbsUp(memoryId: number): Promise<Memory> {
    const memory = this.memories.get(memoryId);
    
    if (!memory) {
      throw new Error(`Memory with ID ${memoryId} not found`);
    }
    
    const updatedMemory = { 
      ...memory, 
      thumbsUpCount: memory.thumbsUpCount + 1 
    };
    
    this.memories.set(memoryId, updatedMemory);
    
    return updatedMemory;
  }
  
  // Daily memory operations
  async getDailyMemoriesByRelationshipAndDate(relationshipId: number, date: Date): Promise<Memory[]> {
    // Format date to compare only year, month, day
    const dateString = date.toISOString().split('T')[0];
    
    // Find all daily memory entries for this relationship and date
    const dailyMemoryEntries = Array.from(this.dailyMemories.values()).filter(dailyMemory => {
      const memoryDate = new Date(dailyMemory.date).toISOString().split('T')[0];
      return dailyMemory.relationshipId === relationshipId && memoryDate === dateString;
    });
    
    // Get the actual memory objects
    const memories: Memory[] = [];
    for (const entry of dailyMemoryEntries) {
      const memory = this.memories.get(entry.memoryId);
      if (memory) {
        memories.push(memory);
      }
    }
    
    return memories;
  }

  async createDailyMemory(insertDailyMemory: InsertDailyMemory): Promise<DailyMemory> {
    const id = this.currentId.dailyMemory++;
    const date = new Date();
    
    const dailyMemory: DailyMemory = { 
      ...insertDailyMemory, 
      id, 
      date 
    };
    
    this.dailyMemories.set(id, dailyMemory);
    
    return dailyMemory;
  }

  async selectRandomMemoriesForDay(relationshipId: number, count: number): Promise<Memory[]> {
    // Get all memories for this relationship
    const allMemories = await this.getMemoriesByRelationship(relationshipId);
    
    if (allMemories.length === 0) {
      return [];
    }
    
    // Apply weighted selection based on thumbs-up count
    const selectedMemories: Memory[] = [];
    const remainingMemories = [...allMemories];
    
    // Select at most 'count' memories or as many as available
    const memoriesToSelect = Math.min(count, remainingMemories.length);
    
    for (let i = 0; i < memoriesToSelect; i++) {
      if (remainingMemories.length === 0) break;
      
      // Calculate total weight
      const totalWeight = remainingMemories.reduce(
        (sum, memory) => sum + (memory.thumbsUpCount + 1), // +1 to ensure all memories have a chance
        0
      );
      
      // Generate a random value between 0 and totalWeight
      let random = Math.random() * totalWeight;
      
      // Find the memory that corresponds to this random value
      let selectedIndex = 0;
      for (let j = 0; j < remainingMemories.length; j++) {
        random -= (remainingMemories[j].thumbsUpCount + 1);
        if (random <= 0) {
          selectedIndex = j;
          break;
        }
      }
      
      // Add the selected memory to our result
      selectedMemories.push(remainingMemories[selectedIndex]);
      
      // Remove the selected memory from remaining options
      remainingMemories.splice(selectedIndex, 1);
    }
    
    return selectedMemories;
  }
}

export const storage = new MemStorage();
