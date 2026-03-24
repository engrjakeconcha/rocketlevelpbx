import { notFound } from "next/navigation";
import { DomainRoutingImportCard } from "@/components/admin/domain-routing-import-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/tenant/access";
import { domainRepository } from "@/repositories/domain-repository";

export default async function DomainDetailPage({ params }: { params: Promise<{ domainId: string }> }) {
  await requireAdminAccess();
  const { domainId } = await params;
  const domain = await domainRepository.findById(domainId);

  if (!domain) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{domain.description}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>Slug: {domain.slug}</div>
          <div>Timezone: {domain.timezone}</div>
          <div>Inbound Number: {domain.inboundNumber ?? "Not configured"}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Live Routing Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DomainRoutingImportCard
            domainId={domain.id}
            backendDomain={
              ((domain.backendMappings.find((mapping) => mapping.mappingType === "SCHEDULE_TEMPLATE")?.metadataJson as
                | {
                    domain?: string;
                  }
                | null)
                ?.domain ?? null)
            }
            timeframeCount={domain.routingTimeframes.length}
            queueCount={domain.routingQueues.length}
            assignmentCount={domain.routingTimeframes.filter((timeframe) => Boolean(timeframe.assignment)).length}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="font-medium">Stored Timeframes</div>
              {domain.routingTimeframes.length === 0 ? (
                <div className="text-sm text-muted-foreground">No timeframes imported yet.</div>
              ) : (
                domain.routingTimeframes.map((timeframe) => (
                  <div key={timeframe.id} className="rounded-xl bg-muted/40 p-3 text-sm">
                    <div className="font-medium text-foreground">{timeframe.name}</div>
                    <div className="text-muted-foreground">
                      {timeframe.externalId} · {timeframe.scope.toLowerCase()}
                    </div>
                    <div className="text-muted-foreground">
                      Linked queue: {timeframe.assignment?.routingQueue.name ?? "Unassigned"}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="font-medium">Stored Linked Queues</div>
              {domain.routingQueues.length === 0 ? (
                <div className="text-sm text-muted-foreground">No queues imported yet.</div>
              ) : (
                domain.routingQueues.map((queue) => (
                  <div key={queue.id} className="rounded-xl bg-muted/40 p-3 text-sm">
                    <div className="font-medium text-foreground">
                      {queue.name} {queue.extension ? `(${queue.extension})` : ""}
                    </div>
                    <div className="text-muted-foreground">{queue.members.length} members</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
