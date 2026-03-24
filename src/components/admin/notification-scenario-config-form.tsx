"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Scenario = {
  id: string;
  name: string;
  description: string | null;
  makeScenarioId: string;
  makeWebhookUrl: string | null;
  makeAuthHeaderName: string | null;
  makeAuthHeaderValue: string | null;
  domain: {
    description: string;
  };
};

type VerificationResult = {
  normalizedScenarioId: string;
  scenario: {
    id: number;
    name: string;
    teamId: number | null;
    isActive: boolean;
    lastEdit: string | null;
    scheduling?: {
      type?: string;
      interval?: number;
    } | null;
  };
  triggers: Array<{
    id: number | null;
    name: string | null;
    type: string | null;
    typeName: string | null;
    url: string | null;
  }>;
};

export function NotificationScenarioConfigForm({ scenarios }: { scenarios: Scenario[] }) {
  const [items, setItems] = useState(scenarios);
  const [message, setMessage] = useState<string | null>(null);
  const [verification, setVerification] = useState<Record<string, VerificationResult | null>>({});
  const [isPending, startTransition] = useTransition();

  function updateItem(index: number, key: keyof Scenario, value: string | null) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  }

  function save(index: number) {
    setMessage(null);

    startTransition(async () => {
      const item = items[index];
      const response = await fetch("/api/admin/notification-scenarios", {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          id: item.id,
          makeScenarioId: item.makeScenarioId,
          makeWebhookUrl: item.makeWebhookUrl,
          makeAuthHeaderName: item.makeAuthHeaderName,
          makeAuthHeaderValue: item.makeAuthHeaderValue
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const formErrors = payload?.error?.formErrors as string[] | undefined;
        const fieldErrors = payload?.error?.fieldErrors as Record<string, string[]> | undefined;
        setMessage(
          formErrors?.[0] ??
            fieldErrors?.makeWebhookUrl?.[0] ??
            fieldErrors?.makeAuthHeaderName?.[0] ??
            "Could not save the Make webhook settings."
        );
        return;
      }

      setItems((current) => current.map((entry) => (entry.id === payload.id ? payload : entry)));
      setMessage(`Saved Make webhook settings for ${item.name}.`);
    });
  }

  function verify(index: number) {
    setMessage(null);

    startTransition(async () => {
      const item = items[index];
      const response = await fetch("/api/admin/make/scenarios/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          scenarioId: item.makeScenarioId
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.error ?? "Could not verify the Make scenario.");
        setVerification((current) => ({ ...current, [item.id]: null }));
        return;
      }

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, makeScenarioId: payload.normalizedScenarioId } : entry
        )
      );
      setVerification((current) => ({ ...current, [item.id]: payload }));
      setMessage(`Verified Make scenario ${payload.scenario.name}.`);
    });
  }

  return (
    <div className="space-y-4">
      {message ? <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{message}</div> : null}
      {items.map((item, index) => (
        <div key={item.id} className="space-y-4 rounded-2xl border border-border p-4">
          <div>
            <div className="font-medium">{item.domain.description}</div>
            <div className="text-sm text-muted-foreground">{item.name}</div>
            {item.description ? <div className="text-sm text-muted-foreground">{item.description}</div> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Scenario ID or Make URL</Label>
              <Input value={item.makeScenarioId} onChange={(event) => updateItem(index, "makeScenarioId", event.target.value)} />
            </div>
            <div>
              <Label>Make Webhook URL</Label>
              <Input value={item.makeWebhookUrl ?? ""} onChange={(event) => updateItem(index, "makeWebhookUrl", event.target.value)} />
            </div>
            <div>
              <Label>Auth Header Name</Label>
              <Input
                value={item.makeAuthHeaderName ?? ""}
                onChange={(event) => updateItem(index, "makeAuthHeaderName", event.target.value)}
              />
            </div>
            <div>
              <Label>Auth Header Value</Label>
              <Input
                value={item.makeAuthHeaderValue ?? ""}
                onChange={(event) => updateItem(index, "makeAuthHeaderValue", event.target.value)}
              />
            </div>
          </div>
          {verification[item.id] ? (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{verification[item.id]?.scenario.name}</div>
              <div>Scenario ID: {verification[item.id]?.normalizedScenarioId}</div>
              <div>Status: {verification[item.id]?.scenario.isActive ? "Active" : "Inactive"}</div>
              <div>Team ID: {verification[item.id]?.scenario.teamId ?? "Unknown"}</div>
              <div>Last Edit: {verification[item.id]?.scenario.lastEdit ?? "Unknown"}</div>
              <div>
                Triggers:{" "}
                {verification[item.id]?.triggers.length
                  ? verification[item.id]?.triggers.map((trigger) => trigger.name ?? trigger.url ?? "Unnamed trigger").join(", ")
                  : "No triggers returned"}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => verify(index)} disabled={isPending}>
              {isPending ? "Verifying..." : "Verify Scenario"}
            </Button>
            <Button type="button" onClick={() => save(index)} disabled={isPending}>
              {isPending ? "Saving..." : "Save Make Scenario Settings"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
