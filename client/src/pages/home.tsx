import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoryList } from "@/components/history-list";
import { SyncStatus } from "@/components/sync-status";
import { ClipboardPreview } from "@/components/clipboard-preview";
import { authenticateWithGoogle } from "@/lib/google-drive";
import { readFromClipboard, saveClipboardEntry } from "@/lib/clipboard";
import { useToast } from "@/hooks/use-toast";
import type { ClipboardEntry, User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

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

  // Check for existing session
  const { data: sessionUser, error: sessionError } = useQuery<User>({
    queryKey: ["/api/auth/session"],
    retry: false
  });

  // Set userId when session is available
  useEffect(() => {
    if (sessionUser?.id) {
      setUserId(sessionUser.id);
    }
  }, [sessionUser]);

  const { data: entries = [], refetch: refetchEntries } = useQuery<ClipboardEntry[]>({
    queryKey: [`/api/clipboard/${userId}`],
    enabled: !!userId,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("No user ID");
      setSyncing(true);
      try {
        const clipboardContent = await readFromClipboard();
        if (clipboardContent) {
          await saveClipboardEntry(clipboardContent, userId);
          await refetchEntries();
          // Update last synced timestamp
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
          toast({
            title: "Sync successful",
            description: "Your clipboard has been synced.",
          });
        }
      } catch (error) {
        throw error;
      } finally {
        setSyncing(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync clipboard",
        variant: "destructive",
      });
    }
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleLogin = async () => {
    const user = await authenticateWithGoogle();
    if (user) {
      setUserId(user.id);
      queryClient.setQueryData(["/api/auth/session"], user);
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
                  lastSynced={sessionUser?.lastSynced ?? null}
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
            <>
              <ClipboardPreview userId={userId} />
              <HistoryList entries={entries} />
            </>
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