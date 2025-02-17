import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const clipboardEntries = pgTable("clipboard_entries", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userId: text("user_id").notNull(),
});

export const insertClipboardEntrySchema = z.object({
  content: z.string().min(1, "Content is required"),
  userId: z.string().min(1, "User ID is required")
}).strict();

export type InsertClipboardEntry = z.infer<typeof insertClipboardEntrySchema>;
export type ClipboardEntry = typeof clipboardEntries.$inferSelect;

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Google user ID
  email: text("email").notNull(),
  name: text("name").notNull(),
  lastSynced: timestamp("last_synced"),
});

// Define a strict schema for Google auth data
export const insertUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required")
}).strict(); // This ensures no extra fields are allowed

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;