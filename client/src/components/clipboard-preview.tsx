import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClipboardPreviewProps {
  userId: string;
}

export function ClipboardPreview({ userId }: ClipboardPreviewProps) {
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

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
      console.error('Failed to read clipboard:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(handlePreview, 1000);
    return () => clearInterval(interval);
  }, [ws]);

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
