import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export function OverviewCards({
  domainName,
  activeStatus,
  activeCoverageMembers,
  timezone,
  lastSyncedAt,
  overrideStatus
}: {
  domainName: string;
  activeStatus: { status: "Open" | "Closed" | "Unknown"; source: string };
  activeCoverageMembers: number;
  timezone: string;
  lastSyncedAt: Date | null;
  overrideStatus: { label: string } | null;
}) {
  const items = [
    { label: "Domain", value: domainName },
    { label: "Timezone", value: timezone },
    { label: "On-Call Technicians", value: `${activeCoverageMembers}` },
    { label: "Last Synced", value: lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Pending" }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-hero-gradient text-white">
        <CardContent className="p-8">
          <div className="space-y-4">
            <div className="text-sm uppercase tracking-[0.28em] text-white/70">Smarter Routing. Less Complexity.</div>
            <div className="text-3xl font-semibold">Control the parts your team actually needs.</div>
            <div className="flex flex-wrap items-center gap-3">
              {activeStatus.status === "Unknown" ? null : <StatusBadge status={activeStatus.status as "Open" | "Closed"} />}
              <div className="text-sm text-white/75">{activeStatus.source}</div>
              {overrideStatus ? <div className="rounded-full bg-white/10 px-3 py-1 text-sm">{overrideStatus.label}</div> : null}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xl font-semibold">{item.value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
