import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/tenant/access";
import { adminRepository } from "@/repositories/admin-repository";

export default async function BackendMappingsPage() {
  await requireAdminAccess();
  const mappings = await adminRepository.listBackendMappings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backend Mappings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mappings.map((mapping) => (
          <div key={mapping.id} className="rounded-2xl border border-border p-4">
            <div className="font-medium">
              {mapping.domain.description} · {mapping.mappingType}
            </div>
            <div className="text-sm text-muted-foreground">
              {mapping.internalKey} → {mapping.externalRef}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
