import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export function SyncStatusCard({
  title,
  status,
  lastSyncedAt,
  description
}: {
  title: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  lastSyncedAt: Date | null;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div>{description}</div>
        <div>
          Last synced{" "}
          {lastSyncedAt ? formatDistanceToNow(lastSyncedAt, { addSuffix: true }) : "has not completed yet"}
        </div>
      </CardContent>
    </Card>
  );
}
