import { redirect } from "next/navigation";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { SyncStatusCard } from "@/components/dashboard/sync-status-card";
import { requireAccessContext } from "@/lib/tenant/access";
import { dashboardService } from "@/services/dashboard-service";
import { scheduleRepository } from "@/repositories/schedule-repository";

export default async function OverviewPage() {
  const access = await requireAccessContext();

  if (access.isAdmin) {
    redirect("/admin");
  }

  const overview = await dashboardService.getOverview(access.domainId!);
  const schedule = await scheduleRepository.getPrimaryTemplate(access.domainId!);

  return (
    <div className="space-y-6">
      <OverviewCards
        domainName={overview.domainName}
        activeStatus={overview.activeStatus as { status: "Open" | "Closed" | "Unknown"; source: string }}
        timezone={overview.timezone}
        lastSyncedAt={overview.lastSyncedAt}
      />
      <div className="grid gap-4">
        <SyncStatusCard
          title="Schedule Sync"
          status={schedule?.syncStatus ?? "PENDING"}
          lastSyncedAt={schedule?.lastSyncedAt ?? null}
          description={schedule?.lastSyncMessage ?? "Changes sync through the Routing Engine API after validation."}
        />
      </div>
    </div>
  );
}
