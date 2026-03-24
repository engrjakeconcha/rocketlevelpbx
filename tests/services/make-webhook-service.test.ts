import { afterEach, describe, expect, it, vi } from "vitest";
import { MakeWebhookService } from "@/services/make-webhook-service";

describe("MakeWebhookService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends scenario contact updates with the configured auth header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true
    });
    vi.stubGlobal("fetch", fetchMock);

    await new MakeWebhookService().syncScenarioContacts({
      name: "Primary Alert Notifications",
      makeScenarioId: "make-servpro-primary",
      makeWebhookUrl: "https://hook.us2.make.com/example",
      makeAuthHeaderName: "x-make-secret",
      makeAuthHeaderValue: "super-secret",
      contacts: [
        {
          channel: "EMAIL",
          destination: "pbxsupport@rocketlevelcommercial.com",
          isActive: true
        },
        {
          channel: "SMS",
          destination: "+18135551234",
          isActive: true
        },
        {
          channel: "EMAIL",
          destination: "disabled@example.com",
          isActive: false
        }
      ]
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://hook.us2.make.com/example",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-make-secret": "super-secret"
        }),
        body: JSON.stringify({
          eventType: "notification_contacts_updated",
          scenarioId: "make-servpro-primary",
          emails: ["pbxsupport@rocketlevelcommercial.com"],
          phones: ["+18135551234"]
        })
      })
    );
  });

  it("skips webhook sync when no webhook URL is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await new MakeWebhookService().syncScenarioContacts({
      name: "Primary Alert Notifications",
      makeScenarioId: "make-servpro-primary",
      makeWebhookUrl: null,
      makeAuthHeaderName: null,
      makeAuthHeaderValue: null,
      contacts: []
    });

    expect(result.status).toBe("SKIPPED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
