import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccessContext } from "@/lib/tenant/access";

export default async function AccountPage() {
  const access = await requireAccessContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div>Name: {access.user.name}</div>
        <div>Email: {access.user.email}</div>
        <div>Domain: {access.membership?.domain.description ?? "Admin access"}</div>
        <div>Notification Scenario: {access.notificationScenarioName ?? "Not assigned"}</div>
      </CardContent>
    </Card>
  );
}
