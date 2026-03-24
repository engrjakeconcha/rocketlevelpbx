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
  id?: string;
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

type RoutingTimeframe = {
  id: string;
  name: string;
  scope: "domain" | "user";
  type: "specific-dates";
  entries: Array<{
    startsAt: string;
    endsAt: string;
  }>;
};

const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toDatetimeLocalValue(value: string) {
  return value.slice(0, 16);
}

function toIsoValue(value: string) {
  return new Date(value).toISOString();
}

export function ScheduleManager({
  timezone,
  rules,
  holidayClosures,
  overrides,
  routingTimeframes,
  routingTimeframesError
}: {
  timezone: string;
  rules: Rule[];
  holidayClosures: Holiday[];
  overrides: Override[];
  routingTimeframes: RoutingTimeframe[];
  routingTimeframesError: string | null;
}) {
  const [items, setItems] = useState(rules);
  const [holidays, setHolidays] = useState(holidayClosures);
  const [timeframes, setTimeframes] = useState(routingTimeframes);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedItems = useMemo(() => [...items].sort((left, right) => left.dayOfWeek - right.dayOfWeek), [items]);
  const usesLiveTimeframes = timeframes.length > 0;

  function updateRule(ruleId: string, next: Partial<Rule>) {
    setItems((current) => current.map((rule) => (rule.id === ruleId ? { ...rule, ...next } : rule)));
  }

  function updateHoliday(index: number, next: Partial<Holiday>) {
    setHolidays((current) => current.map((holiday, itemIndex) => (itemIndex === index ? { ...holiday, ...next } : holiday)));
  }

  function addHoliday() {
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    const endDate = new Date(baseDate);
    endDate.setHours(23, 59, 0, 0);

    setHolidays((current) => [
      ...current,
      {
        name: "New Date Entry",
        startsAt: baseDate.toISOString(),
        endsAt: endDate.toISOString()
      }
    ]);
  }

  function removeHoliday(index: number) {
    setHolidays((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateTimeframeEntry(
    timeframeId: string,
    entryIndex: number,
    next: Partial<{ startsAt: string; endsAt: string }>
  ) {
    setTimeframes((current) =>
      current.map((timeframe) =>
        timeframe.id === timeframeId
          ? {
              ...timeframe,
              entries: timeframe.entries.map((entry, index) => (index === entryIndex ? { ...entry, ...next } : entry))
            }
          : timeframe
      )
    );
  }

  function addTimeframeEntry(timeframeId: string) {
    const startsAt = new Date();
    startsAt.setUTCMinutes(0, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setUTCHours(endsAt.getUTCHours() + 1);

    setTimeframes((current) =>
      current.map((timeframe) =>
        timeframe.id === timeframeId
          ? {
              ...timeframe,
              entries: [...timeframe.entries, { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }]
            }
          : timeframe
      )
    );
  }

  function deleteTimeframeEntry(timeframeId: string, entryIndex: number) {
    setTimeframes((current) =>
      current.map((timeframe) =>
        timeframe.id === timeframeId
          ? {
              ...timeframe,
              entries: timeframe.entries.filter((_, index) => index !== entryIndex)
            }
          : timeframe
      )
    );
  }

  function saveLocalSchedule(nextMessage: string) {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/schedule", {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mode: "local_schedule",
          timezone,
          weeklyRules: sortedItems.map((rule) => ({
            id: rule.id,
            dayOfWeek: rule.dayOfWeek,
            isOpen: rule.isOpen,
            startTime: rule.isOpen ? rule.startTime : null,
            endTime: rule.isOpen ? rule.endTime : null
          })),
          holidayClosures: holidays.map((holiday) => ({
            ...(holiday.id ? { id: holiday.id } : {}),
            name: holiday.name,
            startsAt: holiday.startsAt,
            endsAt: holiday.endsAt
          })),
          overrides
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.error?.formErrors?.[0] ?? "We could not save the schedule changes. Please try again.");
        return;
      }

      const payload = await response.json();
      setItems(payload.weeklyRules);
      setHolidays(payload.holidayClosures);
      setMessage(nextMessage);
    });
  }

  function saveTimeframes() {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/schedule", {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mode: "backend_timeframes",
          timeframes: timeframes.map((timeframe) => ({
            id: timeframe.id,
            name: timeframe.name,
            scope: timeframe.scope,
            type: timeframe.type,
            entries: timeframe.entries
          }))
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.error?.formErrors?.[0] ?? "We could not save the timeframe changes. Please try again.");
        return;
      }

      const payload = await response.json();
      setTimeframes(payload.routingTimeframes ?? []);
      setMessage("Existing timeframes updated.");
    });
  }

  if (usesLiveTimeframes) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Existing Time Frames</CardTitle>
            <div className="text-sm text-muted-foreground">
              Manage the current live time frames and add or remove specific dates without creating new ones.
            </div>
          </div>
          <Button type="button" onClick={saveTimeframes} disabled={isPending}>
            {isPending ? "Saving..." : "Save Time Frames"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {message ? <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{message}</div> : null}
          {routingTimeframesError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {routingTimeframesError}
            </div>
          ) : null}
          {timeframes.map((timeframe) => (
            <div key={timeframe.id} className="rounded-2xl border border-border p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{timeframe.name}</div>
                  <div className="text-sm text-muted-foreground">Scope: {timeframe.scope}</div>
                </div>
                <Button type="button" variant="outline" onClick={() => addTimeframeEntry(timeframe.id)} disabled={isPending}>
                  Add Date
                </Button>
              </div>
              <div className="space-y-3">
                {timeframe.entries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No date entries yet.
                  </div>
                ) : null}
                {timeframe.entries.map((entry, index) => (
                  <div key={`${timeframe.id}-${index}`} className="grid gap-3 rounded-2xl border border-border p-4 md:grid-cols-[1fr,1fr,auto]">
                    <div>
                      <Label>Start</Label>
                      <Input
                        type="datetime-local"
                        value={toDatetimeLocalValue(entry.startsAt)}
                        onChange={(event) =>
                          updateTimeframeEntry(timeframe.id, index, { startsAt: toIsoValue(event.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label>End</Label>
                      <Input
                        type="datetime-local"
                        value={toDatetimeLocalValue(entry.endsAt)}
                        onChange={(event) =>
                          updateTimeframeEntry(timeframe.id, index, { endsAt: toIsoValue(event.target.value) })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => deleteTimeframeEntry(timeframe.id, index)}
                        disabled={isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Existing Weekly Timeframe</CardTitle>
          <Button type="button" onClick={() => saveLocalSchedule("Existing weekly timeframe updated.")} disabled={isPending}>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Timeframe Date Entries</CardTitle>
            <div className="text-sm text-muted-foreground">
              Add or remove date entries for the existing specific-date timeframe.
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={addHoliday} disabled={isPending}>
              Add Date
            </Button>
            <Button type="button" onClick={() => saveLocalSchedule("Timeframe date entries updated.")} disabled={isPending}>
              {isPending ? "Saving..." : "Save Dates"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {holidays.map((holiday, index) => (
            <div key={holiday.id ?? `new-${index}`} className="grid gap-3 rounded-2xl border border-border p-4 md:grid-cols-[1.2fr,1fr,1fr,auto]">
              <div>
                <Label>Name</Label>
                <Input value={holiday.name} onChange={(event) => updateHoliday(index, { name: event.target.value })} />
              </div>
              <div>
                <Label>Start</Label>
                <Input
                  type="datetime-local"
                  value={toDatetimeLocalValue(holiday.startsAt)}
                  onChange={(event) => updateHoliday(index, { startsAt: toIsoValue(event.target.value) })}
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="datetime-local"
                  value={toDatetimeLocalValue(holiday.endsAt)}
                  onChange={(event) => updateHoliday(index, { endsAt: toIsoValue(event.target.value) })}
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={() => removeHoliday(index)} disabled={isPending}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
