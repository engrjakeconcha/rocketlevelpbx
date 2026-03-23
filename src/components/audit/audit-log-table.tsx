import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export function AuditLogTable({
  rows
}: {
  rows: Array<{
    id: string;
    actionType: string;
    objectType: string;
    message: string | null;
    syncStatus: "SUCCESS" | "FAILED" | "PENDING";
    createdAt: Date;
    actor?: { name: string | null } | null;
    domain?: { description: string } | null;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Log</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="pb-3">When</th>
              <th className="pb-3">Actor</th>
              <th className="pb-3">Action</th>
              <th className="pb-3">Object</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="py-4">{row.createdAt.toLocaleString()}</td>
                <td className="py-4">{row.actor?.name ?? row.domain?.description ?? "System"}</td>
                <td className="py-4">{row.actionType}</td>
                <td className="py-4">{row.objectType}</td>
                <td className="py-4">
                  <StatusBadge status={row.syncStatus} />
                </td>
                <td className="py-4 text-muted-foreground">{row.message ?? "No message"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
