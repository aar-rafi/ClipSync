import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertClipboardEntrySchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  app.post("/api/auth/google", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.post("/api/clipboard", async (req, res) => {
    try {
      const entryData = insertClipboardEntrySchema.parse(req.body);
      const entry = await storage.createClipboardEntry(entryData);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ error: "Invalid clipboard data" });
    }
  });

  app.get("/api/clipboard/:userId", async (req, res) => {
    const { userId } = req.params;
    const entries = await storage.getClipboardEntries(userId);
    res.json(entries);
  });

  app.post("/api/sync/:userId", async (req, res) => {
    const { userId } = req.params;
    await storage.updateUserLastSynced(userId);
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
