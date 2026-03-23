"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Member = {
  id: string;
  displayLabel: string;
  memberType: "USER" | "EXTERNAL_NUMBER";
  destinationNumber: string;
  enabled: boolean;
  temporaryStatus: "ACTIVE" | "INACTIVE" | "TEMPORARILY_UNAVAILABLE";
  sortOrder: number;
};

export function DragAndDropCoverageOrder({
  coverageGroupId,
  members
}: {
  coverageGroupId: string;
  members: Member[];
}) {
  const [items, setItems] = useState(members);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const copy = [...items];
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
    setItems(copy.map((item, order) => ({ ...item, sortOrder: order + 1 })));
  }

  function save() {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/coverage", {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          coverageGroupId,
          members: items.map((item) => ({
            id: item.id,
            displayLabel: item.displayLabel,
            memberType: item.memberType,
            destinationNumber: item.destinationNumber,
            enabled: item.enabled,
            temporaryStatus: item.temporaryStatus,
            sortOrder: item.sortOrder
          }))
        })
      });

      if (!response.ok) {
        setMessage("We could not save the coverage order. Please try again.");
        return;
      }

      const payload = await response.json();
      setItems(payload.members);
      setMessage("Coverage order updated.");
    });
  }

  return (
    <div className="space-y-3">
      {message ? <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{message}</div> : null}
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border p-4">
          <div className="font-medium">
            {item.sortOrder}. {item.displayLabel}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => move(index, -1)}>
              Up
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => move(index, 1)}>
              Down
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" onClick={save} disabled={isPending}>
        {isPending ? "Saving..." : "Save Coverage Order"}
      </Button>
    </div>
  );
}
