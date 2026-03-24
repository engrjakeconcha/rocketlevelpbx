import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export function OverrideForm({
  overrides
}: {
  overrides: Array<{ id: string; label: string; mode: string; startsAt: Date; endsAt: Date; enabled: boolean }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Exceptions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {overrides.map((override) => (
          <div key={override.id} className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{override.label}</div>
                <div className="text-sm text-muted-foreground">{override.mode}</div>
              </div>
              <StatusBadge status={override.enabled ? "Active" : "Inactive"} />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {override.startsAt.toLocaleString()} to {override.endsAt.toLocaleString()}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
