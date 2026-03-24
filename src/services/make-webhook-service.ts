type NotificationContactPayload = {
  channel: "EMAIL" | "SMS";
  destination: string;
  isActive: boolean;
};

type MakeWebhookScenario = {
  name: string;
  makeScenarioId: string;
  makeWebhookUrl: string | null;
  makeAuthHeaderName: string | null;
  makeAuthHeaderValue: string | null;
  contacts: NotificationContactPayload[];
};

export class MakeWebhookService {
  async syncScenarioContacts(scenario: MakeWebhookScenario) {
    if (!scenario.makeWebhookUrl) {
      return { status: "SKIPPED" as const, reason: "Webhook URL not configured" };
    }

    const emails = scenario.contacts
      .filter((contact) => contact.isActive && contact.channel === "EMAIL")
      .map((contact) => contact.destination);
    const phones = scenario.contacts
      .filter((contact) => contact.isActive && contact.channel === "SMS")
      .map((contact) => contact.destination);

    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    if (scenario.makeAuthHeaderName && scenario.makeAuthHeaderValue) {
      headers[scenario.makeAuthHeaderName] = scenario.makeAuthHeaderValue;
    }

    const response = await fetch(scenario.makeWebhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        eventType: "notification_contacts_updated",
        scenarioId: scenario.makeScenarioId,
        emails,
        phones
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Make webhook sync failed (${response.status}): ${text || response.statusText}`);
    }

    return { status: "SUCCESS" as const };
  }
}
