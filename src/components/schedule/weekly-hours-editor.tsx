"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Rule = {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string | null;
  endTime: string | null;
};

type Holiday = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

type Override = {
  id: string;
  label: string;
  mode: "FORCE_OPEN" | "FORCE_CLOSED" | "VACATION" | "AFTER_HOURS_FORWARDING";
  startsAt: string;
  endsAt: string;
  targetNumber?: string | null;
};

const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function WeeklyHoursEditor({
  timezone,
  rules,
  holidayClosures,
  overrides
}: {
  timezone: string;
  rules: Rule[];
  holidayClosures: Holiday[];
  overrides: Override[];
}) {
  const [items, setItems] = useState(rules);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedItems = useMemo(() => [...items].sort((left, right) => left.dayOfWeek - right.dayOfWeek), [items]);

  function updateRule(ruleId: string, next: Partial<Rule>) {
    setItems((current) =>
      current.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              ...next
            }
          : rule
      )
    );
  }

  function save() {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/schedule", {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          timezone,
          weeklyRules: sortedItems.map((rule) => ({
            id: rule.id,
            dayOfWeek: rule.dayOfWeek,
            isOpen: rule.isOpen,
            startTime: rule.isOpen ? rule.startTime : null,
            endTime: rule.isOpen ? rule.endTime : null
          })),
          holidayClosures,
          overrides
        })
      });

      if (!response.ok) {
        setMessage("We could not save the schedule changes. Please try again.");
        return;
      }

      const payload = await response.json();
      setItems(
        payload.weeklyRules.map((rule: Rule) => ({
          ...rule
        }))
      );
      setMessage("Weekly business hours updated.");
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Weekly Business Hours</CardTitle>
        <Button type="button" onClick={save} disabled={isPending}>
          {isPending ? "Saving..." : "Save Hours"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{message}</div> : null}
        {sortedItems.map((rule) => (
          <div key={rule.id} className="grid gap-3 rounded-2xl border border-border p-4 md:grid-cols-[180px,120px,1fr,1fr]">
            <div className="font-medium">{dayLabels[rule.dayOfWeek]}</div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rule.isOpen}
                onChange={(event) =>
                  updateRule(rule.id, {
                    isOpen: event.target.checked,
                    startTime: event.target.checked ? rule.startTime ?? "09:00" : null,
                    endTime: event.target.checked ? rule.endTime ?? "17:00" : null
                  })
                }
              />
              Open
            </label>
            <div>
              <Label>Start</Label>
              <Input
                type="time"
                value={rule.startTime ?? ""}
                disabled={!rule.isOpen}
                onChange={(event) => updateRule(rule.id, { startTime: event.target.value })}
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                type="time"
                value={rule.endTime ?? ""}
                disabled={!rule.isOpen}
                onChange={(event) => updateRule(rule.id, { endTime: event.target.value })}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
