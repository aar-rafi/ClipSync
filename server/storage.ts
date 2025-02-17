import { type User, type InsertUser, type ClipboardEntry, type InsertClipboardEntry } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastSynced(id: string): Promise<void>;
  getClipboardEntries(userId: string): Promise<ClipboardEntry[]>;
  createClipboardEntry(entry: InsertClipboardEntry): Promise<ClipboardEntry>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clipboardEntries: Map<number, ClipboardEntry>;
  private currentEntryId: number;

  constructor() {
    this.users = new Map();
    this.clipboardEntries = new Map();
    this.currentEntryId = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(user: InsertUser): Promise<User> {
    this.users.set(user.id, user as User);
    return user as User;
  }

  async updateUserLastSynced(id: string): Promise<void> {
    const user = await this.getUser(id);
    if (user) {
      user.lastSynced = new Date();
      this.users.set(id, user);
    }
  }

  async getClipboardEntries(userId: string): Promise<ClipboardEntry[]> {
    return Array.from(this.clipboardEntries.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createClipboardEntry(entry: InsertClipboardEntry): Promise<ClipboardEntry> {
    const id = this.currentEntryId++;
    const timestamp = new Date();
    const clipboardEntry: ClipboardEntry = { ...entry, id, timestamp };
    this.clipboardEntries.set(id, clipboardEntry);
    return clipboardEntry;
  }
}

export const storage = new MemStorage();
