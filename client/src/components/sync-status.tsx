import { Check, CloudOff, RefreshCw } from "lucide-react";

interface SyncStatusProps {
  syncing: boolean;
  lastSynced: Date | null;
  error?: string;
}

export function SyncStatus({ syncing, lastSynced, error }: SyncStatusProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {error ? (
        <>
          <CloudOff className="h-4 w-4 text-destructive" />
          <span className="text-destructive">{error}</span>
        </>
      ) : syncing ? (
        <>
          <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
          <span className="text-muted-foreground">Syncing...</span>
        </>
      ) : (
        <>
          <Check className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">
            {lastSynced
              ? `Last synced ${new Date(lastSynced).toLocaleTimeString()}`
              : "Not synced yet"}
          </span>
        </>
      )}
    </div>
  );
}