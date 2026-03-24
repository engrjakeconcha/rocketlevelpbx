"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Contact = {
  id: string;
  label: string;
  channel: "EMAIL" | "SMS";
  destination: string;
  sortOrder: number;
  isActive: boolean;
};

export function NotificationContactsEditor({
  scenarioName,
  makeScenarioId,
  contacts
}: {
  scenarioName: string;
  makeScenarioId: string;
  contacts: Contact[];
}) {
  const [items, setItems] = useState<Contact[]>(contacts);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateContact(index: number, key: keyof Contact, value: string | boolean | number) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  }

  function addContact(channel: "EMAIL" | "SMS") {
    setItems((current) => [
      ...current,
      {
        id: `new-${crypto.randomUUID()}`,
        label: channel === "EMAIL" ? "New Email Contact" : "New SMS Contact",
        channel,
        destination: "",
        sortOrder: current.length + 1,
        isActive: true
      }
    ]);
  }

  function removeContact(index: number) {
    setItems((current) =>
      current
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({
          ...item,
          sortOrder: itemIndex + 1
        }))
    );
  }

  function save() {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          contacts: items.map((item, index) => ({
            id: item.id.startsWith("new-") ? undefined : item.id,
            label: item.label,
            channel: item.channel,
            destination: item.destination,
            sortOrder: index + 1,
            isActive: item.isActive
          }))
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.error?.formErrors?.[0] ?? "We could not save the notification contacts. Please try again.");
        return;
      }

      setItems(payload.contacts);
      setMessage("Notification contacts updated.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border p-4">
        <div className="font-medium">{scenarioName}</div>
        <div className="text-sm text-muted-foreground">Linked Make scenario: {makeScenarioId}</div>
      </div>
      {message ? <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{message}</div> : null}
      {items.map((item, index) => (
        <div key={item.id} className="space-y-3 rounded-2xl border border-border p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Label</Label>
              <Input value={item.label} onChange={(event) => updateContact(index, "label", event.target.value)} />
            </div>
            <div>
              <Label>Channel</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.channel}
                onChange={(event) => updateContact(index, "channel", event.target.value as "EMAIL" | "SMS")}
              >
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div>
              <Label>{item.channel === "EMAIL" ? "Email Address" : "Phone Number"}</Label>
              <Input value={item.destination} onChange={(event) => updateContact(index, "destination", event.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={item.isActive}
                  onChange={(event) => updateContact(index, "isActive", event.target.checked)}
                />
                Active
              </label>
              <Button type="button" variant="outline" onClick={() => removeContact(index)}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => addContact("EMAIL")}>
          Add Email
        </Button>
        <Button type="button" variant="outline" onClick={() => addContact("SMS")}>
          Add SMS
        </Button>
        <Button type="button" onClick={save} disabled={isPending}>
          {isPending ? "Saving..." : "Save Notification Contacts"}
        </Button>
      </div>
    </div>
  );
}
