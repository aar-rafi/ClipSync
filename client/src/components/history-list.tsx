import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy } from "lucide-react";
import { writeToClipboard } from "@/lib/clipboard";
import { useToast } from "@/hooks/use-toast";
import type { ClipboardEntry } from "@shared/schema";

interface HistoryListProps {
  entries: ClipboardEntry[];
}

export function HistoryList({ entries }: HistoryListProps) {
  const { toast } = useToast();

  const handleCopy = async (content: string) => {
    const success = await writeToClipboard(content);
    if (success) {
      toast({
        title: "Copied to clipboard",
        description: "The content has been copied to your clipboard.",
      });
    } else {
      toast({
        title: "Failed to copy",
        description: "Could not copy the content to your clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border">
      <div className="p-4 space-y-4">
        {entries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {entry.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(entry.content)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
