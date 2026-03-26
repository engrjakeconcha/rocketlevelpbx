"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DomainOption = {
  id: string;
  description: string;
  notificationScenarios: Array<{
    id: string;
    name: string;
  }>;
};

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
  memberships: Array<{
    domain: {
      description: string;
    };
  }>;
  notificationScenario: {
    name: string;
  } | null;
  syncResult?: {
    backendDomain: string;
    timeframeCount: number;
    queueCount: number;
    assignmentCount: number;
  } | null;
  syncWarning?: string | null;
};

export function CreateUserForm({
  domains
}: {
  domains: DomainOption[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CUSTOMER">("CUSTOMER");
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const [notificationScenarioId, setNotificationScenarioId] = useState(domains[0]?.notificationScenarios[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedDomain = domains.find((domain) => domain.id === domainId) ?? null;
  const availableScenarios = selectedDomain?.notificationScenarios ?? [];

  function submit() {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          domainId: role === "CUSTOMER" ? domainId : null,
          notificationScenarioId: role === "CUSTOMER" ? notificationScenarioId : null
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const formErrors = payload?.error?.formErrors as string[] | undefined;
        const fieldErrors = payload?.error?.fieldErrors as Record<string, string[]> | undefined;
        setMessage(
          formErrors?.[0] ??
            fieldErrors?.notificationScenarioId?.[0] ??
            fieldErrors?.domainId?.[0] ??
            fieldErrors?.email?.[0] ??
            "Could not create user."
        );
        return;
      }

      const createdUser = payload as UserRecord;
      setName("");
      setEmail("");
      setPassword("");
      setRole("CUSTOMER");
      setDomainId(domains[0]?.id ?? "");
      setNotificationScenarioId(domains[0]?.notificationScenarios[0]?.id ?? "");
      setMessage(
        createdUser.syncWarning
          ? `User created. Domain sync needs attention: ${createdUser.syncWarning}`
          : createdUser.syncResult
            ? `User created. Synced ${createdUser.syncResult.timeframeCount} timeframes and ${createdUser.syncResult.queueCount} queues for ${selectedDomain?.description ?? "the selected domain"}.`
            : "User created."
      );
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border p-4">
      <div className="text-sm text-muted-foreground">
        Multiple customer users can share the same domain and notification scenario.
      </div>
      {message ? <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{message}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <div>
          <Label>Role</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as "ADMIN" | "CUSTOMER")}
          >
            <option value="CUSTOMER">Customer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <Label>Domain</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            value={domainId}
            disabled={role !== "CUSTOMER"}
            onChange={(event) => {
              const nextDomainId = event.target.value;
              setDomainId(nextDomainId);
              const nextDomain = domains.find((domain) => domain.id === nextDomainId);
              setNotificationScenarioId(nextDomain?.notificationScenarios[0]?.id ?? "");
            }}
          >
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.description}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label>Notification Scenario</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          value={notificationScenarioId}
          disabled={role !== "CUSTOMER"}
          onChange={(event) => setNotificationScenarioId(event.target.value)}
        >
          {availableScenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" onClick={submit} disabled={isPending}>
        {isPending ? "Creating..." : "Create User"}
      </Button>
    </div>
  );
}
