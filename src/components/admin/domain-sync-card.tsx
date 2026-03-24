"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DomainSyncCard({ domainCount }: { domainCount: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function syncDomains() {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/domains/import", {
        method: "POST"
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.error ?? "Could not sync accessible domains.");
        return;
      }

      setMessage(`Synced ${payload.count} accessible domains.`);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border p-4">
      <div className="text-sm text-muted-foreground">
        Current portal domains: {domainCount}. Run this to import every domain visible in your reseller access.
      </div>
      {message ? <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{message}</div> : null}
      <Button type="button" onClick={syncDomains} disabled={isPending}>
        {isPending ? "Syncing..." : "Sync Accessible Domains"}
      </Button>
    </div>
  );
}
