import { AdminDomainSwitcher } from "@/components/admin/domain-switcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/tenant/access";
import { domainRepository } from "@/repositories/domain-repository";
import { adminRepository } from "@/repositories/admin-repository";

export default async function AdminDashboardPage() {
  await requireAdminAccess();
  const domains = await domainRepository.listForAdmin();
  const syncJobs = await adminRepository.listSyncJobs();

  return (
    <div className="space-y-6">
      <AdminDomainSwitcher domains={domains} />
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {syncJobs.slice(0, 8).map((job) => (
            <div key={job.id} className="rounded-2xl border border-border p-4">
              <div className="font-medium">
                {job.domain.description} · {job.resourceType}
              </div>
              <div className="text-sm text-muted-foreground">
                {job.status} · requested {job.requestedAt.toLocaleString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
