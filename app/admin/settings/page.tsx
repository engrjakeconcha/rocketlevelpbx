import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/tenant/access";

export default async function SettingsPage() {
  await requireAdminAccess();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
        <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>Feature flags and support tooling would be managed here.</div>
          <div>The base tenant architecture remains onboarding-controlled and hidden from customer users.</div>
          <div>Notification scenario management is currently parked and hidden from the portal.</div>
        </CardContent>
      </Card>
    </div>
  );
}
