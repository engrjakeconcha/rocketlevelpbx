import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/tenant/access";

export default async function SettingsPage() {
  await requireAdminAccess();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div>Feature flags, notification controls, and support impersonation would be managed here.</div>
        <div>The base tenant architecture remains onboarding-controlled and hidden from customer users.</div>
      </CardContent>
    </Card>
  );
}
