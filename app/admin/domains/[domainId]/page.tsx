import { notFound } from "next/navigation";
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
    </div>
  );
}
