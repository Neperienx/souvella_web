import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase UID
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  photoURL: text("photo_url"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Relationship table
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRelationshipSchema = createInsertSchema(relationships).omit({
  id: true,
  createdAt: true,
});

// UserRelationship join table
export const userRelationships = pgTable("user_relationships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  relationshipId: integer("relationship_id").notNull().references(() => relationships.id),
});

export const insertUserRelationshipSchema = createInsertSchema(userRelationships).omit({
  id: true,
});

// Memory types enum
export const MemoryType = z.enum(["text", "image", "audio"]);
export type MemoryType = z.infer<typeof MemoryType>;

// Memory table
export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  relationshipId: integer("relationship_id").notNull().references(() => relationships.id),
  type: text("type").notNull(), // 'text', 'image', 'audio'
  content: text("content").notNull(), // Text content or URL to media file
  createdAt: timestamp("created_at").notNull().defaultNow(),
  thumbsUpCount: integer("thumbs_up_count").notNull().default(0),
});

export const insertMemorySchema = createInsertSchema(memories).omit({
  id: true,
  thumbsUpCount: true,
  createdAt: true,
});

// DailyMemory table to track which memories were shown on which days
export const dailyMemories = pgTable("daily_memories", {
  id: serial("id").primaryKey(),
  relationshipId: integer("relationship_id").notNull().references(() => relationships.id),
  memoryId: integer("memory_id").notNull().references(() => memories.id),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertDailyMemorySchema = createInsertSchema(dailyMemories).omit({
  id: true,
  date: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Relationship = typeof relationships.$inferSelect;
export type InsertRelationship = z.infer<typeof insertRelationshipSchema>;

export type UserRelationship = typeof userRelationships.$inferSelect;
export type InsertUserRelationship = z.infer<typeof insertUserRelationshipSchema>;

export type Memory = typeof memories.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;

export type DailyMemory = typeof dailyMemories.$inferSelect;
export type InsertDailyMemory = z.infer<typeof insertDailyMemorySchema>;
