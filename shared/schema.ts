import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clipboardEntries = pgTable("clipboard_entries", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userId: text("user_id").notNull(),
});

export const insertClipboardEntrySchema = createInsertSchema(clipboardEntries).omit({
  id: true,
  timestamp: true
});

export type InsertClipboardEntry = z.infer<typeof insertClipboardEntrySchema>;
export type ClipboardEntry = typeof clipboardEntries.$inferSelect;

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Google user ID
  email: text("email").notNull(),
  name: text("name").notNull(),
  lastSynced: timestamp("last_synced"),
});

// Modify the user schema to match Google auth data structure
export const insertUserSchema = createInsertSchema(users).omit({
  lastSynced: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;