import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClipboardPreviewProps {
  userId: string;
}

export function ClipboardPreview({ userId }: ClipboardPreviewProps) {
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const [hasPermission, setHasPermission] = useState(true);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'register', userId }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'preview') {
          setPreviewContent(data.content);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [userId]);

  // Request clipboard permission on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'clipboard-read' as PermissionName })
        .then(result => {
          setHasPermission(result.state === 'granted');
          result.addEventListener('change', () => {
            setHasPermission(result.state === 'granted');
          });
        })
        .catch(() => {
          // Fallback for browsers that don't support clipboard permission API
          setHasPermission(true);
        });
    }
  }, []);

  // Send preview updates when clipboard content changes
  const handlePreview = async () => {
    try {
      const content = await navigator.clipboard.readText();
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'preview',
          content
        }));
      }
    } catch (error) {
      // Only show the error toast if it's not a focus-related error
      if (error instanceof Error && !error.message.includes('Document is not focused')) {
        toast({
          title: "Clipboard Error",
          description: "Unable to access clipboard content. Please ensure you've granted permission.",
          variant: "destructive",
        });
        setHasPermission(false);
      }
    }
  };

  useEffect(() => {
    if (hasPermission) {
      const interval = setInterval(handlePreview, 1000);
      return () => clearInterval(interval);
    }
  }, [ws, hasPermission]);

  if (!hasPermission) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">
              Please grant clipboard access permission and ensure the window is focused to enable clipboard preview.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!previewContent) return null;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <Badge variant="secondary" className="shrink-0">Preview</Badge>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
            {previewContent}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}