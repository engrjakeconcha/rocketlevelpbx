import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/tenant/access";
import { adminRepository } from "@/repositories/admin-repository";

export default async function SyncMonitorPage() {
  await requireAdminAccess();
  const syncJobs = await adminRepository.listSyncJobs();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {syncJobs.map((job) => (
          <div key={job.id} className="rounded-2xl border border-border p-4">
            <div className="font-medium">
              {job.domain.description} · {job.resourceType} · {job.status}
            </div>
            <div className="text-sm text-muted-foreground">
              Operation {job.operation} · Retries {job.retryCount}
            </div>
            {job.lastError ? <div className="mt-2 text-sm text-danger">{job.lastError}</div> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
