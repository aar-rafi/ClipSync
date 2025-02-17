import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertClipboardEntrySchema } from "@shared/schema";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
}

const connectedClients: ConnectedClient[] = [];

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let userId: string | undefined;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'register') {
          userId = data.userId;
          connectedClients.push({ ws, userId: data.userId });
          console.log(`Client registered with userId: ${userId}`);
        } else if (data.type === 'preview') {
          // Broadcast preview to all other clients of the same user
          connectedClients
            .filter(client => client.userId === userId && client.ws !== ws)
            .forEach(client => {
              if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({
                  type: 'preview',
                  content: data.content
                }));
              }
            });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        const index = connectedClients.findIndex(
          client => client.ws === ws && client.userId === userId
        );
        if (index !== -1) {
          connectedClients.splice(index, 1);
          console.log(`Client disconnected: ${userId}`);
        }
      }
    });
  });

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

  return httpServer;
}