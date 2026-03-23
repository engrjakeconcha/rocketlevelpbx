import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminDomainSwitcher({
  domains
}: {
  domains: Array<{ id: string; description: string; slug: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain Switcher</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {domains.map((domain) => (
          <a key={domain.id} href={`/admin/domains/${domain.id}`} className="rounded-2xl border border-border p-4 hover:bg-muted">
            <div className="font-medium">{domain.description}</div>
            <div className="text-sm text-muted-foreground">{domain.slug}</div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
