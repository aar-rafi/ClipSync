import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoryList } from "@/components/history-list";
import { SyncStatus } from "@/components/sync-status";
import { authenticateWithGoogle } from "@/lib/google-drive";
import { readFromClipboard, saveClipboardEntry } from "@/lib/clipboard";
import { useToast } from "@/hooks/use-toast";
import type { ClipboardEntry } from "@shared/schema";

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const { data: entries = [], refetch: refetchEntries } = useQuery<ClipboardEntry[]>({
    queryKey: userId ? ["/api/clipboard/" + userId] : undefined,
    enabled: !!userId,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      setSyncing(true);
      try {
        const clipboardContent = await readFromClipboard();
        if (clipboardContent) {
          await saveClipboardEntry(clipboardContent, userId);
          await refetchEntries();
        }
      } finally {
        setSyncing(false);
      }
    },
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleLogin = async () => {
    const user = await authenticateWithGoogle();
    if (user) {
      setUserId(user.id);
      toast({
        title: "Logged in successfully",
        description: "You can now sync your clipboard across devices.",
      });
    } else {
      toast({
        title: "Login failed",
        description: "Could not log in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Initialize Google API client
    window.gapi.load("client", async () => {
      try {
        await window.gapi.client.init({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        });
      } catch (error) {
        console.error("Error initializing Google API client:", error);
      }
    });
  }, []);

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Clipboard Sync</CardTitle>
            {userId ? (
              <div className="flex items-center gap-4">
                <SyncStatus
                  syncing={syncing}
                  lastSynced={entries[0]?.timestamp}
                  error={syncMutation.error instanceof Error ? syncMutation.error.message : undefined}
                />
                <Button onClick={handleSync} disabled={syncing}>
                  Sync Now
                </Button>
              </div>
            ) : (
              <Button onClick={handleLogin}>Login with Google</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {userId ? (
            <HistoryList entries={entries} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Please login to start syncing your clipboard
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}