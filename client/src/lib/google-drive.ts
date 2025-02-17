import { apiRequest } from "./queryClient";

interface GoogleUser {
  id: string;
  email: string;
  name: string;
}

const DRIVE_FILE_NAME = "clipboard-sync-data.json";

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export async function initGoogleAuth() {
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata",
    callback: () => {},
  });
  return client;
}

export async function authenticateWithGoogle(): Promise<GoogleUser | null> {
  try {
    const response = await new Promise((resolve) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        callback: (resp: any) => resolve(resp),
      });
      client.requestAccessToken();
    });

    if (!response) return null;

    const userInfo = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${(response as any).access_token}` },
    }).then(r => r.json());

    console.log('Raw Google userInfo:', userInfo); // Debug log

    // Format user data to match our schema
    const user: GoogleUser = {
      id: userInfo.sub, // Google's unique identifier
      email: userInfo.email,
      name: userInfo.given_name // Changed to given_name as that's what Google provides
    };

    console.log('Formatted user data:', user); // Debug log

    // Send the properly formatted user data to our backend
    const result = await apiRequest("POST", "/api/auth/google", user);
    const userData = await result.json();
    console.log('Backend response:', userData); // Debug log

    if (userData.error) {
      throw new Error(`Authentication failed: ${JSON.stringify(userData.error)}`);
    }

    return user;
  } catch (error) {
    console.error("Google authentication error:", error);
    throw error;
  }
}

export async function syncToGoogleDrive(content: string): Promise<boolean> {
  try {
    // Find or create the sync file
    const file = await findOrCreateSyncFile();

    // Update file content
    await window.gapi.client.drive.files.update({
      fileId: file.id,
      media: {
        mimeType: "application/json",
        body: JSON.stringify({ content, timestamp: new Date().toISOString() }),
      },
    });

    return true;
  } catch (error) {
    console.error("Sync error:", error);
    return false;
  }
}

async function findOrCreateSyncFile() {
  const response = await window.gapi.client.drive.files.list({
    spaces: "appDataFolder",
    fields: "files(id, name)",
    q: `name='${DRIVE_FILE_NAME}'`,
  });

  if (response.result.files && response.result.files.length > 0) {
    return response.result.files[0];
  }

  const file = await window.gapi.client.drive.files.create({
    resource: {
      name: DRIVE_FILE_NAME,
      parents: ["appDataFolder"],
    },
    fields: "id",
  });

  return file.result;
}