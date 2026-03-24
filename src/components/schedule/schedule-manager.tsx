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
    recurrenceType: "doesNotRecur" | "custom";
    recurrenceIntervalCount?: number;
    recurrenceIntervalUnit?: "weeks" | "months";
  }>;
  linkedQueue: {
    id: string;
    name: string;
    extension?: string | null;
    members: Array<{
      id: string;
      displayLabel: string;
      destinationNumber: string;
      sortOrder: number;
      enabled: boolean;
      requestConfirmationEnabled: boolean;
    }>;
  } | null;
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
    next: Partial<{
      startsAt: string;
      endsAt: string;
      recurrenceType: "doesNotRecur" | "custom";
      recurrenceIntervalCount?: number;
      recurrenceIntervalUnit?: "weeks" | "months";
    }>
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
              entries: [
                ...timeframe.entries,
                {
                  startsAt: startsAt.toISOString(),
                  endsAt: endsAt.toISOString(),
                  recurrenceType: "doesNotRecur"
                }
              ]
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

  function updateQueueMember(
    timeframeId: string,
    memberIndex: number,
    next: Partial<{
      displayLabel: string;
      destinationNumber: string;
      enabled: boolean;
      requestConfirmationEnabled: boolean;
    }>
  ) {
    setTimeframes((current) =>
      current.map((timeframe) =>
        timeframe.id === timeframeId && timeframe.linkedQueue
          ? {
              ...timeframe,
              linkedQueue: {
                ...timeframe.linkedQueue,
                members: timeframe.linkedQueue.members.map((member, index) =>
                  index === memberIndex ? { ...member, ...next } : member
                )
              }
            }
          : timeframe
      )
    );
  }

  function addQueueMember(timeframeId: string) {
    setTimeframes((current) =>
      current.map((timeframe) =>
        timeframe.id === timeframeId && timeframe.linkedQueue
          ? {
              ...timeframe,
              linkedQueue: {
                ...timeframe.linkedQueue,
                members: [
                  ...timeframe.linkedQueue.members,
                  {
                    id: `new-${Date.now()}-${Math.random()}`,
                    displayLabel: `Tech ${timeframe.linkedQueue.members.length + 1}`,
                    destinationNumber: "",
                    sortOrder: timeframe.linkedQueue.members.length + 1,
                    enabled: true,
                    requestConfirmationEnabled: true
                  }
                ]
              }
            }
          : timeframe
      )
    );
  }

  function removeQueueMember(timeframeId: string, memberIndex: number) {
    setTimeframes((current) =>
      current.map((timeframe) =>
        timeframe.id === timeframeId && timeframe.linkedQueue
          ? {
              ...timeframe,
              linkedQueue: {
                ...timeframe.linkedQueue,
                members: timeframe.linkedQueue.members
                  .filter((_, index) => index !== memberIndex)
                  .map((member, index) => ({
                    ...member,
                    sortOrder: index + 1
                  }))
              }
            }
          : timeframe
      )
    );
  }

  function moveQueueMember(timeframeId: string, memberIndex: number, direction: -1 | 1) {
    setTimeframes((current) =>
      current.map((timeframe) => {
        if (timeframe.id !== timeframeId || !timeframe.linkedQueue) {
          return timeframe;
        }

        const nextIndex = memberIndex + direction;

        if (nextIndex < 0 || nextIndex >= timeframe.linkedQueue.members.length) {
          return timeframe;
        }

        const members = [...timeframe.linkedQueue.members];
        [members[memberIndex], members[nextIndex]] = [members[nextIndex], members[memberIndex]];

        return {
          ...timeframe,
          linkedQueue: {
            ...timeframe.linkedQueue,
            members: members.map((member, index) => ({
              ...member,
              sortOrder: index + 1
            }))
          }
        };
      })
    );
  }

  function saveLinkedQueue(timeframeId: string) {
    const timeframe = timeframes.find((item) => item.id === timeframeId);

    if (!timeframe?.linkedQueue) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/timeframe-queues/${encodeURIComponent(timeframeId)}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          members: timeframe.linkedQueue?.members.map((member, index) => ({
            id: member.id.startsWith("new-") ? undefined : member.id,
            displayLabel: member.displayLabel,
            destinationNumber: member.destinationNumber,
            sortOrder: index + 1,
            enabled: member.enabled,
            requestConfirmationEnabled: member.requestConfirmationEnabled
          }))
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.error?.formErrors?.[0] ?? "We could not save the linked queue members. Please try again.");
        return;
      }

      const payload = await response.json();
      setTimeframes((current) =>
        current.map((item) =>
          item.id === timeframeId
            ? {
                ...item,
                linkedQueue: payload.assignment?.routingQueue
                    ? {
                      id: payload.assignment.routingQueue.externalId,
                      name: payload.assignment.routingQueue.name,
                      extension: payload.assignment.routingQueue.extension,
                      members: payload.assignment.routingQueue.members.map((member: {
                        id: string;
                        displayLabel: string;
                        destinationNumber: string;
                        sortOrder: number;
                        enabled: boolean;
                        requestConfirmationEnabled: boolean;
                      }) => ({
                        id: member.id,
                        displayLabel: member.displayLabel,
                        destinationNumber: member.destinationNumber,
                        sortOrder: member.sortOrder,
                        enabled: member.enabled,
                        requestConfirmationEnabled: member.requestConfirmationEnabled
                      }))
                    }
                  : item.linkedQueue
              }
            : item
        )
      );
      setMessage("Linked on-call technician queue updated.");
    });
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
                  <div className="text-sm text-muted-foreground">
                    Scope: {timeframe.scope}
                    {timeframe.linkedQueue ? ` · Linked Queue: ${timeframe.linkedQueue.name}${timeframe.linkedQueue.extension ? ` (${timeframe.linkedQueue.extension})` : ""}` : ""}
                  </div>
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
                  <div key={`${timeframe.id}-${index}`} className="grid gap-3 rounded-2xl border border-border p-4 md:grid-cols-[1fr,1fr,180px,120px,140px,auto]">
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
                    <div>
                      <Label>Recurs</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={entry.recurrenceType}
                        onChange={(event) =>
                          updateTimeframeEntry(timeframe.id, index, {
                            recurrenceType: event.target.value as "doesNotRecur" | "custom",
                            recurrenceIntervalCount: event.target.value === "custom" ? entry.recurrenceIntervalCount ?? 1 : undefined,
                            recurrenceIntervalUnit: event.target.value === "custom" ? entry.recurrenceIntervalUnit ?? "weeks" : undefined
                          })
                        }
                      >
                        <option value="doesNotRecur">One time</option>
                        <option value="custom">Repeats</option>
                      </select>
                    </div>
                    <div>
                      <Label>Every</Label>
                      <Input
                        type="number"
                        min="1"
                        value={entry.recurrenceType === "custom" ? String(entry.recurrenceIntervalCount ?? 1) : ""}
                        disabled={entry.recurrenceType !== "custom"}
                        onChange={(event) =>
                          updateTimeframeEntry(timeframe.id, index, {
                            recurrenceIntervalCount: Number(event.target.value || 1)
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={entry.recurrenceType === "custom" ? entry.recurrenceIntervalUnit ?? "weeks" : "weeks"}
                        disabled={entry.recurrenceType !== "custom"}
                        onChange={(event) =>
                          updateTimeframeEntry(timeframe.id, index, {
                            recurrenceIntervalUnit: event.target.value as "weeks" | "months"
                          })
                        }
                      >
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
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
              {timeframe.linkedQueue ? (
                <div className="mt-6 space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">Assigned Numbers</div>
                      <div className="text-sm text-muted-foreground">
                        The linked queue stays locked to this timeframe. Customers can update numbers and order only.
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => addQueueMember(timeframe.id)} disabled={isPending}>
                        Add Number
                      </Button>
                      <Button type="button" onClick={() => saveLinkedQueue(timeframe.id)} disabled={isPending}>
                        {isPending ? "Saving..." : "Save Numbers"}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {timeframe.linkedQueue.members.map((member, index) => (
                      <div key={member.id} className="grid gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-[1fr,1fr,120px,170px,auto]">
                        <div>
                          <Label>Label</Label>
                          <Input
                            value={member.displayLabel}
                            onChange={(event) => updateQueueMember(timeframe.id, index, { displayLabel: event.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Phone Number</Label>
                          <Input
                            value={member.destinationNumber}
                            onChange={(event) => updateQueueMember(timeframe.id, index, { destinationNumber: event.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={member.enabled}
                              onChange={(event) => updateQueueMember(timeframe.id, index, { enabled: event.target.checked })}
                            />
                            Enabled
                          </label>
                        </div>
                        <div className="space-y-2">
                          <Label>Request Confirmation</Label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={member.requestConfirmationEnabled}
                              onChange={(event) =>
                                updateQueueMember(timeframe.id, index, { requestConfirmationEnabled: event.target.checked })
                              }
                            />
                            Required
                          </label>
                        </div>
                        <div className="flex items-end gap-2">
                          <Button type="button" variant="outline" onClick={() => moveQueueMember(timeframe.id, index, -1)}>
                            Up
                          </Button>
                          <Button type="button" variant="outline" onClick={() => moveQueueMember(timeframe.id, index, 1)}>
                            Down
                          </Button>
                          <Button type="button" variant="outline" onClick={() => removeQueueMember(timeframe.id, index)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
