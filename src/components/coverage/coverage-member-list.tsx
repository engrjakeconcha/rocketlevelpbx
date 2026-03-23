import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export function CoverageMemberList({
  members
}: {
  members: Array<{
    id: string;
    displayLabel: string;
    destinationNumber: string;
    enabled: boolean;
    sortOrder: number;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Coverage Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <div className="font-medium">
                {member.sortOrder}. {member.displayLabel}
              </div>
              <div className="text-sm text-muted-foreground">{member.destinationNumber}</div>
            </div>
            <StatusBadge status={member.enabled ? "Active" : "Inactive"} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
