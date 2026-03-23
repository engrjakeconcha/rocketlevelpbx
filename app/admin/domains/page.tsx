import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/tenant/access";
import { domainRepository } from "@/repositories/domain-repository";

export default async function DomainsPage() {
  await requireAdminAccess();
  const domains = await domainRepository.listForAdmin();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domains</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {domains.map((domain) => (
          <a key={domain.id} href={`/admin/domains/${domain.id}`} className="block rounded-2xl border border-border p-4">
            <div className="font-medium">{domain.description}</div>
            <div className="text-sm text-muted-foreground">
              {domain.slug} · {domain.timezone}
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
