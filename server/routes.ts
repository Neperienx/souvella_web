import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertMemorySchema, 
  insertDailyMemorySchema,
  MemoryType
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/auth/user", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUid(userData.uid);
      
      if (existingUser) {
        return res.json(existingUser);
      }
      
      const newUser = await storage.createUser(userData);
      return res.json(newUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", details: error.errors });
      }
      return res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/auth/user/:uid", async (req: Request, res: Response) => {
    try {
      const { uid } = req.params;
      const user = await storage.getUserByUid(uid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json(user);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Relationship routes
  app.post("/api/relationships", async (req: Request, res: Response) => {
    try {
      const { uid, name } = req.body;
      
      if (!uid) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const user = await storage.getUserByUid(uid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create a new relationship (allowing multiple relationships), with optional name
      const relationship = await storage.createRelationship(name);
      
      // Add user to relationship
      await storage.addUserToRelationship(user.id, relationship.id);
      
      return res.json(relationship);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create relationship" });
    }
  });
  
  app.patch("/api/relationships/:id/name", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Relationship name is required" });
      }
      
      const relationshipId = parseInt(id);
      if (isNaN(relationshipId)) {
        return res.status(400).json({ message: "Invalid relationship ID" });
      }
      
      const updatedRelationship = await storage.updateRelationshipName(relationshipId, name);
      
      if (!updatedRelationship) {
        return res.status(404).json({ message: "Relationship not found" });
      }
      
      return res.json(updatedRelationship);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update relationship name" });
    }
  });

  app.get("/api/relationships/user/:uid", async (req: Request, res: Response) => {
    try {
      const { uid } = req.params;
      const user = await storage.getUserByUid(uid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const relationship = await storage.getUserRelationship(user.id);
      
      if (!relationship) {
        return res.status(404).json({ message: "Relationship not found" });
      }
      
      return res.json(relationship);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch relationship" });
    }
  });

  app.post("/api/relationships/join", async (req: Request, res: Response) => {
    try {
      const { uid, inviteCode } = req.body;
      
      if (!uid || !inviteCode) {
        return res.status(400).json({ message: "User ID and invite code are required" });
      }
      
      const user = await storage.getUserByUid(uid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Find relationship by invite code
      const relationship = await storage.getRelationshipByInviteCode(inviteCode);
      
      if (!relationship) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      
      // Check if user is already in this specific relationship
      const userRelationships = await storage.getUserRelationships(user.id);
      const alreadyInRelationship = userRelationships.some(rel => rel.id === relationship.id);
      
      if (alreadyInRelationship) {
        return res.status(400).json({ 
          message: "User is already part of this relationship", 
          relationship 
        });
      }
      
      // Add user to relationship
      await storage.addUserToRelationship(user.id, relationship.id);
      
      return res.json(relationship);
    } catch (error) {
      return res.status(500).json({ message: "Failed to join relationship" });
    }
  });

  // Memory routes
  app.post("/api/memories", async (req: Request, res: Response) => {
    try {
      const memoryData = insertMemorySchema.parse(req.body);
      
      // Validate the memory type
      if (!MemoryType.safeParse(memoryData.type).success) {
        return res.status(400).json({ message: "Invalid memory type" });
      }
      
      // No need to check user existence here as we'll validate with the memories
      
      const today = new Date();
      const todaysMemories = await storage.getMemoriesByUserAndDate(memoryData.userId, today);
      
      if (todaysMemories.length > 0) {
        return res.status(400).json({ message: "User has already uploaded a memory today" });
      }
      
      // Create the memory
      const memory = await storage.createMemory(memoryData);
      
      return res.json(memory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid memory data", details: error.errors });
      }
      return res.status(500).json({ message: "Failed to create memory" });
    }
  });

  app.get("/api/memories/relationship/:relationshipId", async (req: Request, res: Response) => {
    try {
      const { relationshipId } = req.params;
      const memories = await storage.getMemoriesByRelationship(parseInt(relationshipId, 10));
      
      return res.json(memories);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch memories" });
    }
  });

  app.post("/api/memories/:memoryId/react", async (req: Request, res: Response) => {
    try {
      const { memoryId } = req.params;
      const memory = await storage.incrementThumbsUp(parseInt(memoryId, 10));
      
      return res.json(memory);
    } catch (error) {
      return res.status(500).json({ message: "Failed to react to memory" });
    }
  });

  // Daily memories routes
  app.get("/api/daily-memories/:relationshipId", async (req: Request, res: Response) => {
    try {
      const { relationshipId } = req.params;
      const today = new Date();
      
      // Check if daily memories exist for today
      let dailyMemories = await storage.getDailyMemoriesByRelationshipAndDate(
        parseInt(relationshipId, 10),
        today
      );
      
      // If no memories selected for today, select 3 random ones
      if (dailyMemories.length === 0) {
        const randomMemories = await storage.selectRandomMemoriesForDay(
          parseInt(relationshipId, 10),
          3
        );
        
        // Save these as today's daily memories
        for (const memory of randomMemories) {
          await storage.createDailyMemory({
            relationshipId: parseInt(relationshipId, 10),
            memoryId: memory.id
          });
        }
        
        dailyMemories = randomMemories;
      }
      
      return res.json(dailyMemories);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch daily memories" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
