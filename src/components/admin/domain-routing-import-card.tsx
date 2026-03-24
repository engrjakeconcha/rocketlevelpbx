"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type ImportedSnapshot = {
  backendDomain: string;
  timeframeCount: number;
  queueCount: number;
  assignmentCount: number;
};

export function DomainRoutingImportCard({
  domainId,
  backendDomain,
  timeframeCount,
  queueCount,
  assignmentCount
}: {
  domainId: string;
  backendDomain: string | null;
  timeframeCount: number;
  queueCount: number;
  assignmentCount: number;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ImportedSnapshot | null>(null);
  const [isPending, startTransition] = useTransition();

  function runImport() {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/domains/${domainId}/routing-import`, {
        method: "POST"
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.error ?? "Could not import the live timeframe and queue snapshot.");
        return;
      }

      setSnapshot(payload);
      setMessage("Imported the current live timeframe and queue snapshot.");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border p-4">
      <div className="space-y-1 text-sm text-muted-foreground">
        <div>Live routing domain: {backendDomain ?? "Not configured"}</div>
        <div>
          Stored snapshot: {timeframeCount} timeframes, {queueCount} queues, {assignmentCount} linked assignments
        </div>
      </div>
      {snapshot ? (
        <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
          Imported {snapshot.timeframeCount} timeframes, {snapshot.queueCount} queues, and {snapshot.assignmentCount} linked
          assignments from {snapshot.backendDomain}.
        </div>
      ) : null}
      {message ? <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{message}</div> : null}
      <Button type="button" onClick={runImport} disabled={isPending || !backendDomain}>
        {isPending ? "Importing..." : "Import Live Timeframes and Queues"}
      </Button>
    </div>
  );
}
