import { redirect } from "next/navigation";
import { NotificationContactsEditor } from "@/components/notifications/notification-contacts-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccessContext } from "@/lib/tenant/access";
import { NotificationService } from "@/services/notification-service";

export default async function NotificationsPage() {
  const access = await requireAccessContext();

  if (access.isAdmin) {
    redirect("/admin");
  }

  const scenario = await new NotificationService().getAssignedScenario(access);

  if (!scenario) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No notification scenario assigned</CardTitle>
        </CardHeader>
        <CardContent>Your account must be linked to an existing notification scenario before you can edit alert contacts.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <NotificationContactsEditor
          scenarioName={scenario.name}
          makeScenarioId={scenario.makeScenarioId}
          contacts={scenario.contacts.map((contact) => ({
            id: contact.id,
            label: contact.label,
            channel: contact.channel,
            destination: contact.destination,
            sortOrder: contact.sortOrder,
            isActive: contact.isActive
          }))}
        />
      </CardContent>
    </Card>
  );
}
