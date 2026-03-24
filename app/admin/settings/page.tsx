import { NotificationScenarioConfigForm } from "@/components/admin/notification-scenario-config-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/tenant/access";
import { NotificationService } from "@/services/notification-service";

export default async function SettingsPage() {
  const access = await requireAdminAccess();
  const scenarios = await new NotificationService().listScenarios(access);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>Feature flags, notification controls, and support impersonation would be managed here.</div>
          <div>The base tenant architecture remains onboarding-controlled and hidden from customer users.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Make Notification Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationScenarioConfigForm
            scenarios={scenarios.map((scenario) => ({
              id: scenario.id,
              name: scenario.name,
              description: scenario.description,
              makeScenarioId: scenario.makeScenarioId,
              makeWebhookUrl: scenario.makeWebhookUrl,
              makeAuthHeaderName: scenario.makeAuthHeaderName,
              makeAuthHeaderValue: scenario.makeAuthHeaderValue,
              domain: {
                description: scenario.domain.description
              }
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
