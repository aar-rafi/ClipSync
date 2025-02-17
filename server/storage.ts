import { type User, type InsertUser, type ClipboardEntry, type InsertClipboardEntry, users, clipboardEntries } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db } from "./db";
import { eq } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastSynced(id: string): Promise<void>;
  getClipboardEntries(userId: string): Promise<ClipboardEntry[]>;
  createClipboardEntry(entry: InsertClipboardEntry): Promise<ClipboardEntry>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserLastSynced(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastSynced: new Date() })
      .where(eq(users.id, id));
  }

  async getClipboardEntries(userId: string): Promise<ClipboardEntry[]> {
    return await db
      .select()
      .from(clipboardEntries)
      .where(eq(clipboardEntries.userId, userId))
      .orderBy(clipboardEntries.timestamp, 'desc' as const); // Fix LSP issue by adding type assertion
  }

  async createClipboardEntry(entry: InsertClipboardEntry): Promise<ClipboardEntry> {
    const [newEntry] = await db
      .insert(clipboardEntries)
      .values({
        ...entry,
        timestamp: new Date()
      })
      .returning();
    return newEntry;
  }
}

export const storage = new DatabaseStorage();