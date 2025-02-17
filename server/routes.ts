import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertClipboardEntrySchema } from "@shared/schema";
import type { User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    user: User;
  }
}

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  deviceId: string;
}

const connectedClients: ConnectedClient[] = [];

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let userId: string | undefined;
    let deviceId: string | undefined;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'register') {
          userId = data.userId;
          deviceId = data.deviceId || Date.now().toString(); // Generate device ID if not provided
          connectedClients.push({ ws, userId, deviceId });
          console.log(`Client registered with userId: ${userId}, deviceId: ${deviceId}`);
        } else if (data.type === 'preview') {
          // Broadcast preview to all other devices of the same user
          connectedClients
            .filter(client => 
              client.userId === userId && 
              client.deviceId !== deviceId && 
              client.ws.readyState === WebSocket.OPEN
            )
            .forEach(client => {
              client.ws.send(JSON.stringify({
                type: 'preview',
                content: data.content,
                sourceDevice: deviceId
              }));
            });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId && deviceId) {
        const index = connectedClients.findIndex(
          client => client.ws === ws && 
                    client.userId === userId && 
                    client.deviceId === deviceId
        );
        if (index !== -1) {
          connectedClients.splice(index, 1);
          console.log(`Client disconnected: ${userId} (device: ${deviceId})`);
        }
      }
    });
  });

  app.get("/api/auth/session", (req, res) => {
    const user = req.session.user;
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post("/api/auth/google", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      req.session.user = user;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      res.json(user);
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.post("/api/clipboard", async (req, res) => {
    try {
      const entryData = insertClipboardEntrySchema.parse(req.body);
      const entry = await storage.createClipboardEntry(entryData);
      // Update user's lastSynced timestamp
      await storage.updateUserLastSynced(entryData.userId);
      // Update session with the new lastSynced timestamp
      if (req.session.user) {
        req.session.user = await storage.getUser(req.session.user.id) || req.session.user;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
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
    // Update session with the new lastSynced timestamp
    if (req.session.user) {
      req.session.user = await storage.getUser(userId) || req.session.user;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    res.json({ success: true });
  });

  return httpServer;
}