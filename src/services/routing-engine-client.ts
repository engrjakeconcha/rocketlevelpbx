import { z } from "zod";
import { getEnv } from "@/lib/env";
import { normalizePhoneNumber } from "@/lib/utils/phone";
import { RoutingEngineTokenManager } from "@/services/routing-engine-token-manager";

const timeframeScopeSchema = z.enum(["domain", "user"]).default("domain");

const scheduleMappingSchema = z.object({
  domain: z.string().min(1),
  user: z.string().min(1).optional(),
  weeklyTimeframeId: z.string().min(1).optional(),
  weeklyTimeframeName: z.string().min(1),
  weeklyTimeframeScope: timeframeScopeSchema.optional(),
  holidayTimeframeId: z.string().min(1).optional(),
  holidayTimeframeName: z.string().min(1).optional(),
  holidayTimeframeScope: timeframeScopeSchema.optional(),
  overrideTimeframePrefix: z.string().min(1).optional(),
  overrideTimeframeScope: timeframeScopeSchema.optional()
});

const timeframeLookupSchema = z.object({
  domain: z.string().min(1),
  user: z.string().min(1).optional()
});

const coverageMemberMappingSchema = z.object({
  memberType: z.enum(["USER", "EXTERNAL_NUMBER"]),
  destinationNumber: z.string().min(1),
  agentId: z.string().min(1)
});

const coverageMappingSchema = z.object({
  domain: z.string().min(1),
  callqueue: z.string().min(1),
  description: z.string().min(1).optional(),
  dispatchType: z
    .enum(["Round-robin", "Tiered Round-robin", "Ring All", "Linear Cascade", "Linear Hunt", "Call Park"])
    .optional(),
  agentDispatchTimeoutSeconds: z.number().int().nonnegative().optional(),
  initialRingCount: z.number().int().nonnegative().optional(),
  ringIncrement: z.number().int().nonnegative().optional(),
  memberMappings: z.array(coverageMemberMappingSchema).default([]),
  agentDefaults: z
    .object({
      availabilityType: z.enum(["automatic", "manual", "disabled", "offnet-automatic"]).optional(),
      answerConfirmationEnabled: z.boolean().optional(),
      autoAnswerEnabled: z.boolean().optional(),
      wrapUpAllowanceSeconds: z.number().int().nonnegative().optional(),
      maxActiveCallsTotal: z.number().int().positive().optional(),
      maxConcurrentSmsConversations: z.number().int().positive().optional()
    })
    .optional()
});

type TimeframeScope = z.infer<typeof timeframeScopeSchema>;
type ScheduleMapping = z.infer<typeof scheduleMappingSchema>;
type CoverageMapping = z.infer<typeof coverageMappingSchema>;

type WeeklyRulePayload = {
  dayOfWeek: number;
  isOpen: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

type HolidayClosurePayload = {
  name: string;
  startsAt: string | Date;
  endsAt: string | Date;
};

type ScheduleOverridePayload = {
  label: string;
  mode: "FORCE_OPEN" | "FORCE_CLOSED" | "VACATION" | "AFTER_HOURS_FORWARDING";
  startsAt: string | Date;
  endsAt: string | Date;
  targetNumber?: string | null;
};

type ScheduleSyncPayload = {
  timezone?: string;
  weeklyRules: WeeklyRulePayload[];
  holidayClosures: HolidayClosurePayload[];
  overrides: ScheduleOverridePayload[];
};

type CoverageMemberPayload = {
  displayLabel: string;
  memberType: "USER" | "EXTERNAL_NUMBER";
  destinationNumber: string;
  enabled: boolean;
  temporaryStatus: "ACTIVE" | "INACTIVE" | "TEMPORARILY_UNAVAILABLE";
  sortOrder: number;
};

type CoverageSyncPayload = {
  name?: string;
  members: CoverageMemberPayload[];
};

type RoutingTimeframe = {
  "timeframe-id"?: string;
  "timeframe-name"?: string;
  "timeframe-type"?: string;
  "timeframe-specific-dates-array"?: Array<{
    "timeframe-specific-dates-begin-date"?: string;
    "timeframe-specific-dates-begin-time"?: string;
    "timeframe-specific-dates-end-date"?: string;
    "timeframe-specific-dates-end-time"?: string;
    "timeframe-recurrence-type"?: string;
    "timeframe-recurrence-custom-interval-count"?: string;
    "timeframe-recurrence-custom-interval"?: string;
  }>;
};

export type ManagedScheduleTimeframe = {
  id: string;
  name: string;
  scope: TimeframeScope;
  type: "specific-dates";
  entries: Array<{
    startsAt: string;
    endsAt: string;
    recurrenceType: "doesNotRecur" | "custom";
    recurrenceIntervalCount?: number;
    recurrenceIntervalUnit?: "weeks" | "months";
  }>;
};

export type LegacyManagedScheduleTimeframe = {
  key: "weekly" | "holiday" | "override";
  id?: string;
  name: string;
  scope: TimeframeScope;
  exists: boolean;
  type: "days-of-week" | "specific-dates";
};

type RoutingAnswerRule = {
  "time-frame"?: string;
};

type RoutingAgent = {
  "callqueue-agent-id": string;
  "callqueue-agent-answer-confirmation-enabled"?: string;
  "callqueue-agent-availability-type"?: string;
  "callqueue-agent-entry-type"?: string;
  "ordinal-order"?: number;
};

type RoutingCallqueue = {
  callqueue?: string;
  description?: string;
  "callqueue-dispatch-type"?: string;
  "callqueue-agent-dispatch-timeout-seconds"?: number;
  "callqueue-sim-ring-1st-round"?: number;
  "callqueue-sim-ring-increment"?: number;
};

type RoutingDomain = {
  domain?: string;
  description?: string;
  "time-zone"?: string;
  "limits-max-users"?: number;
  "limits-max-call-queues"?: number;
};

export type ManagedRoutingQueue = {
  id: string;
  name: string;
  extension: string | null;
  linearRoutingEnabled: boolean;
  snapshot: Record<string, unknown>;
};

export type ManagedRoutingQueueMember = {
  externalId: string;
  displayLabel: string;
  destinationNumber: string;
  enabled: boolean;
  requestConfirmationEnabled: boolean;
  sortOrder: number;
};

export type ManagedRoutingDomain = {
  backendDomain: string;
  description: string;
  timezone: string;
  policy: {
    maxUsers: number;
    maxCallQueues: number;
  };
};

function toYesNo(value: boolean) {
  return value ? "yes" : "no";
}

function formatTime(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.replace(":", "");
}

function asDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function formatDatePart(value: string | Date) {
  const date = asDate(value);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatTimePart(value: string | Date) {
  const date = asDate(value);
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  return `${hours}${minutes}`;
}

function parseSpecificDate(datePart?: string, timePart?: string) {
  if (!datePart || !timePart) {
    return null;
  }

  const year = datePart.slice(0, 4);
  const month = datePart.slice(4, 6);
  const day = datePart.slice(6, 8);
  const hours = timePart.slice(0, 2) || "00";
  const minutes = timePart.slice(2, 4) || "00";
  return `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`;
}

function parseRecurrence(entry: NonNullable<RoutingTimeframe["timeframe-specific-dates-array"]>[number]) {
  const recurrenceType = entry["timeframe-recurrence-type"];
  const recurrenceUnit = entry["timeframe-recurrence-custom-interval"];
  const recurrenceCount = Number(entry["timeframe-recurrence-custom-interval-count"] || 0);

  if (recurrenceType === "custom" && (recurrenceUnit === "weeks" || recurrenceUnit === "months") && recurrenceCount > 0) {
    return {
      recurrenceType: "custom" as const,
      recurrenceIntervalCount: recurrenceCount,
      recurrenceIntervalUnit: recurrenceUnit as "weeks" | "months"
    };
  }

  return {
    recurrenceType: "doesNotRecur" as const
  };
}

function encodePath(value: string) {
  return encodeURIComponent(value);
}

function normalizeRoutingTimezone(value?: string) {
  if (!value) {
    return "America/New_York";
  }

  const aliases: Record<string, string> = {
    "US/Eastern": "America/New_York",
    "US/Central": "America/Chicago",
    "US/Mountain": "America/Denver",
    "US/Pacific": "America/Los_Angeles",
    "US/Arizona": "America/Phoenix",
    "US/Alaska": "America/Anchorage",
    "US/Hawaii": "Pacific/Honolulu"
  };

  return aliases[value] ?? value;
}

function normalizeDomainLookup(metadata?: unknown) {
  const mapping = timeframeLookupSchema.parse(metadata ?? {});
  return {
    domain: mapping.domain
  };
}

function buildScopePath(mapping: { domain: string; user?: string }, scope: TimeframeScope) {
  return scope === "user"
    ? `/domains/${encodePath(mapping.domain)}/users/${encodePath(mapping.user ?? "")}`
    : `/domains/${encodePath(mapping.domain)}`;
}

function buildDayOfWeekTimeframeBody(weeklyRules: WeeklyRulePayload[]) {
  const fieldNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ] as const;

  const entry = weeklyRules.reduce<Record<string, string>>((accumulator, rule) => {
    const fieldName = fieldNames[rule.dayOfWeek];
    accumulator[`timeframe-weekly-${fieldName}-begin-time-1`] = rule.isOpen ? formatTime(rule.startTime) : "";
    accumulator[`timeframe-weekly-${fieldName}-end-time-1`] = rule.isOpen ? formatTime(rule.endTime) : "";
    accumulator[`timeframe-weekly-${fieldName}-begin-time-2`] = "";
    accumulator[`timeframe-weekly-${fieldName}-end-time-2`] = "";
    return accumulator;
  }, {});

  return {
    "update-only": "yes",
    "timeframe-days-of-week-array": [
      {
        ...entry,
        "timeframe-recurrence-type": "weekly",
        "timeframe-recurrence-begin-date": formatDatePart(new Date()),
        "timeframe-recurrence-custom-interval": "",
        "timeframe-recurrence-custom-interval-count": "",
        "timeframe-recurrence-custom-interval-option": "",
        "timeframe-recurrence-end-option": "never",
        "timeframe-recurrence-end-date": ""
      }
    ]
  };
}

function buildHolidayEntries(holidayClosures: HolidayClosurePayload[]) {
  return holidayClosures.map((holiday) => ({
    "timeframe-specific-dates-begin-date": formatDatePart(holiday.startsAt),
    "timeframe-specific-dates-begin-time": formatTimePart(holiday.startsAt),
    "timeframe-specific-dates-end-date": formatDatePart(holiday.endsAt),
    "timeframe-specific-dates-end-time": formatTimePart(holiday.endsAt),
    "timeframe-recurrence-type": "doesNotRecur",
    "timeframe-recurrence-custom-interval": "",
    "timeframe-recurrence-custom-interval-count": "",
    "timeframe-recurrence-custom-interval-option": "",
    "timeframe-recurrence-end-option": "never",
    "timeframe-recurrence-end-date": ""
  }));
}

function buildOverrideEntries(override: ScheduleOverridePayload) {
  return [
    {
      "timeframe-specific-dates-begin-date": formatDatePart(override.startsAt),
      "timeframe-specific-dates-begin-time": formatTimePart(override.startsAt),
      "timeframe-specific-dates-end-date": formatDatePart(override.endsAt),
      "timeframe-specific-dates-end-time": formatTimePart(override.endsAt),
      "timeframe-recurrence-type": "doesNotRecur",
      "timeframe-recurrence-custom-interval": "",
      "timeframe-recurrence-custom-interval-count": "",
      "timeframe-recurrence-custom-interval-option": "",
      "timeframe-recurrence-end-option": "never",
      "timeframe-recurrence-end-date": ""
    }
  ];
}

function buildOverrideRule(override: ScheduleOverridePayload, timeframeName: string) {
  const defaultRule = {
    synchronous: true,
    "time-frame": timeframeName,
    enabled: "yes",
    "do-not-disturb": { enabled: "no" },
    "forward-always": { enabled: "no", parameters: [] }
  };

  if (override.mode === "FORCE_CLOSED") {
    return {
      ...defaultRule,
      "do-not-disturb": { enabled: "yes" }
    };
  }

  if (override.mode === "VACATION" || override.mode === "AFTER_HOURS_FORWARDING") {
    if (!override.targetNumber) {
      throw new Error(`${override.mode} overrides require a target number`);
    }

    return {
      ...defaultRule,
      "forward-always": {
        enabled: "yes",
        parameters: [normalizePhoneNumber(override.targetNumber)]
      }
    };
  }

  return defaultRule;
}

export class RoutingEngineClient {
  constructor(
    private readonly config = (() => {
      const env = getEnv();
      return {
        baseUrl: env.ROUTING_API_BASE_URL
      };
    })(),
    private readonly tokenManager = new RoutingEngineTokenManager()
  ) {}

  private async request<T>(path: string, init: RequestInit, hasRetried = false): Promise<T> {
    const accessToken = await this.tokenManager.getAccessToken();
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
        ...(init.headers ?? {})
      },
      cache: "no-store"
    });

    if (response.status === 401 && this.tokenManager.canRefresh() && !hasRetried) {
      await this.tokenManager.invalidate(accessToken);
      return this.request<T>(path, init, true);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Routing Engine API request failed: ${response.status} ${body}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return null as T;
    }

    return (await response.json()) as T;
  }

  private async listTimeframes(mapping: { domain: string; user?: string }, scope: TimeframeScope) {
    return this.request<RoutingTimeframe[]>(`${buildScopePath(mapping, scope)}/timeframes`, {
      method: "GET"
    });
  }

  private async createTimeframe(
    mapping: { domain: string; user?: string },
    scope: TimeframeScope,
    body: Record<string, unknown>
  ) {
    return this.request<RoutingTimeframe>(`${buildScopePath(mapping, scope)}/timeframes`, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  private async updateTimeframe(
    mapping: { domain: string; user?: string },
    scope: TimeframeScope,
    timeframeId: string,
    body: Record<string, unknown>
  ) {
    return this.request(`${buildScopePath(mapping, scope)}/timeframes/${encodePath(timeframeId)}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  }

  private async deleteTimeframe(mapping: { domain: string; user?: string }, scope: TimeframeScope, timeframeId: string) {
    return this.request(`${buildScopePath(mapping, scope)}/timeframes/${encodePath(timeframeId)}`, {
      method: "DELETE"
    });
  }

  private async listAnswerRules(mapping: { domain: string; user: string }) {
    return this.request<RoutingAnswerRule[]>(
      `/domains/${encodePath(mapping.domain)}/users/${encodePath(mapping.user)}/answerrules`,
      { method: "GET" }
    );
  }

  private async createAnswerRule(mapping: { domain: string; user: string }, body: Record<string, unknown>) {
    return this.request(`/domains/${encodePath(mapping.domain)}/users/${encodePath(mapping.user)}/answerrules`, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  private async deleteAnswerRule(mapping: { domain: string; user: string }, timeframeName: string) {
    return this.request(
      `/domains/${encodePath(mapping.domain)}/users/${encodePath(mapping.user)}/answerrules/${encodePath(timeframeName)}`,
      { method: "DELETE" }
    );
  }

  private async updateCallqueue(mapping: CoverageMapping, payload: CoverageSyncPayload) {
    return this.request(`/domains/${encodePath(mapping.domain)}/callqueues/${encodePath(mapping.callqueue)}`, {
      method: "PUT",
      body: JSON.stringify({
        description: mapping.description ?? payload.name ?? "RocketLevel AI Coverage Group",
        ...(mapping.dispatchType ? { "callqueue-dispatch-type": mapping.dispatchType } : {}),
        ...(mapping.agentDispatchTimeoutSeconds !== undefined
          ? { "callqueue-agent-dispatch-timeout-seconds": mapping.agentDispatchTimeoutSeconds }
          : {}),
        ...(mapping.initialRingCount !== undefined ? { "callqueue-sim-ring-1st-round": mapping.initialRingCount } : {}),
        ...(mapping.ringIncrement !== undefined ? { "callqueue-sim-ring-increment": mapping.ringIncrement } : {})
      })
    });
  }

  private async listCallqueueAgents(mapping: CoverageMapping) {
    return this.request<RoutingAgent[]>(
      `/domains/${encodePath(mapping.domain)}/callqueues/${encodePath(mapping.callqueue)}/agents`,
      { method: "GET" }
    );
  }

  private async listCallqueues(domain: string) {
    return this.request<RoutingCallqueue[]>(`/domains/${encodePath(domain)}/callqueues`, {
      method: "GET"
    });
  }

  private async listDomains() {
    return this.request<RoutingDomain[]>("/domains", {
      method: "GET"
    });
  }

  private async createCallqueueAgent(mapping: CoverageMapping, body: Record<string, unknown>) {
    return this.request(`/domains/${encodePath(mapping.domain)}/callqueues/${encodePath(mapping.callqueue)}/agents`, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  private async updateCallqueueAgent(mapping: CoverageMapping, agentId: string, body: Record<string, unknown>) {
    return this.request(
      `/domains/${encodePath(mapping.domain)}/callqueues/${encodePath(mapping.callqueue)}/agents/${encodePath(agentId)}`,
      {
        method: "PUT",
        body: JSON.stringify(body)
      }
    );
  }

  private async deleteCallqueueAgent(mapping: CoverageMapping, agentId: string) {
    return this.request(
      `/domains/${encodePath(mapping.domain)}/callqueues/${encodePath(mapping.callqueue)}/agents/${encodePath(agentId)}`,
      { method: "DELETE" }
    );
  }

  private async resolveExistingTimeframeId(
    mapping: { domain: string; user?: string },
    scope: TimeframeScope,
    timeframeId: string | undefined,
    timeframeName: string
  ) {
    const existing = await this.listTimeframes(mapping, scope);
    const match = timeframeId
      ? existing.find((timeframe) => timeframe["timeframe-id"] === timeframeId)
      : existing.find((timeframe) => timeframe["timeframe-name"] === timeframeName);

    if (match?.["timeframe-id"] && match?.["timeframe-name"]) {
      return match["timeframe-id"];
    }

    throw new Error(
      `Existing timeframe "${timeframeName}" was not found. Onboarding must create it before customer edits are allowed.`
    );
  }

  async listManagedScheduleTimeframes(metadata?: unknown) {
    const mapping = scheduleMappingSchema.parse(metadata ?? {});
    const weeklyScope = mapping.weeklyTimeframeScope ?? (mapping.user ? "user" : "domain");
    const holidayScope = mapping.holidayTimeframeScope ?? weeklyScope;
    const results: LegacyManagedScheduleTimeframe[] = [];

    const weeklyTimeframes = await this.listTimeframes(mapping, weeklyScope);
    const weeklyMatch = mapping.weeklyTimeframeId
      ? weeklyTimeframes.find((timeframe) => timeframe["timeframe-id"] === mapping.weeklyTimeframeId)
      : weeklyTimeframes.find((timeframe) => timeframe["timeframe-name"] === mapping.weeklyTimeframeName);

    results.push({
      key: "weekly",
      id: weeklyMatch?.["timeframe-id"] ?? mapping.weeklyTimeframeId,
      name: weeklyMatch?.["timeframe-name"] ?? mapping.weeklyTimeframeName,
      scope: weeklyScope,
      exists: Boolean(weeklyMatch?.["timeframe-id"]),
      type: "days-of-week"
    });

    if (mapping.holidayTimeframeName) {
      const holidayTimeframes = weeklyScope === holidayScope ? weeklyTimeframes : await this.listTimeframes(mapping, holidayScope);
      const holidayMatch = mapping.holidayTimeframeId
        ? holidayTimeframes.find((timeframe) => timeframe["timeframe-id"] === mapping.holidayTimeframeId)
        : holidayTimeframes.find((timeframe) => timeframe["timeframe-name"] === mapping.holidayTimeframeName);

      results.push({
        key: "holiday",
        id: holidayMatch?.["timeframe-id"] ?? mapping.holidayTimeframeId,
        name: holidayMatch?.["timeframe-name"] ?? mapping.holidayTimeframeName,
        scope: holidayScope,
        exists: Boolean(holidayMatch?.["timeframe-id"]),
        type: "specific-dates"
      });
    }

    if (mapping.user && mapping.overrideTimeframePrefix) {
      const overrideScope = mapping.overrideTimeframeScope ?? "user";
      const overrideTimeframes = await this.listTimeframes(mapping, overrideScope);

      for (const timeframe of overrideTimeframes.filter((item) =>
        item["timeframe-name"]?.startsWith(mapping.overrideTimeframePrefix ?? "")
      )) {
        results.push({
          key: "override",
          id: timeframe["timeframe-id"],
          name: timeframe["timeframe-name"] ?? mapping.overrideTimeframePrefix,
          scope: overrideScope,
          exists: Boolean(timeframe["timeframe-id"]),
          type: "specific-dates"
        });
      }
    }

    return results;
  }

  async listEditableTimeframes(metadata?: unknown) {
    const mapping = timeframeLookupSchema.parse(metadata ?? {});
    const domainTimeframes = await this.listTimeframes(mapping, "domain");
    const userTimeframes = mapping.user ? await this.listTimeframes(mapping, "user") : [];

    const mapTimeframes = (items: RoutingTimeframe[], scope: TimeframeScope): ManagedScheduleTimeframe[] =>
      items
        .filter((timeframe) => timeframe["timeframe-id"] && timeframe["timeframe-type"] === "specific-dates")
        .map((timeframe) => {
          const parsedEntries: ManagedScheduleTimeframe["entries"] = [];

          for (const entry of timeframe["timeframe-specific-dates-array"] ?? []) {
            const startsAt = parseSpecificDate(
              entry["timeframe-specific-dates-begin-date"],
              entry["timeframe-specific-dates-begin-time"]
            );
            const endsAt = parseSpecificDate(
              entry["timeframe-specific-dates-end-date"],
              entry["timeframe-specific-dates-end-time"]
            );

            if (!startsAt || !endsAt) {
              continue;
            }

            parsedEntries.push({
              startsAt,
              endsAt,
              ...parseRecurrence(entry)
            });
          }

          return {
            id: timeframe["timeframe-id"] as string,
            name: timeframe["timeframe-name"] ?? "Unnamed timeframe",
            scope,
            type: "specific-dates" as const,
            entries: parsedEntries
          };
        });

    return [...mapTimeframes(domainTimeframes, "domain"), ...mapTimeframes(userTimeframes, "user")];
  }

  async listDomainCallqueues(metadata?: unknown) {
    const { domain } = normalizeDomainLookup(metadata);
    const queues = await this.listCallqueues(domain);

    return queues
      .filter((queue) => queue.callqueue)
      .map((queue) => ({
        id: queue.callqueue as string,
        name: queue.description ?? `Queue ${queue.callqueue}`,
        extension: queue.callqueue ?? null,
        linearRoutingEnabled: (queue["callqueue-dispatch-type"] ?? "").toLowerCase().includes("linear"),
        snapshot: queue as Record<string, unknown>
      }));
  }

  async listAccessibleDomains() {
    const domains = await this.listDomains();

    return domains
      .filter((domain) => domain.domain)
      .map((domain) => ({
        backendDomain: domain.domain as string,
        description: domain.description ?? (domain.domain as string),
        timezone: normalizeRoutingTimezone(domain["time-zone"]),
        policy: {
          maxUsers: domain["limits-max-users"] ?? 0,
          maxCallQueues: domain["limits-max-call-queues"] ?? 0
        }
      }));
  }

  async listCallqueueMembers(args: { domain: string; callqueue: string }) {
    const mapping: CoverageMapping = {
      domain: args.domain,
      callqueue: args.callqueue,
      memberMappings: []
    };
    const agents = await this.listCallqueueAgents(mapping);

    return agents
      .filter((agent) => agent["callqueue-agent-id"])
      .map((agent) => {
        const destinationNumber = normalizePhoneNumber(agent["callqueue-agent-id"]);

        return {
          externalId: agent["callqueue-agent-id"],
          displayLabel: destinationNumber,
          destinationNumber,
          enabled: agent["callqueue-agent-availability-type"] !== "disabled",
          requestConfirmationEnabled: agent["callqueue-agent-answer-confirmation-enabled"] === "yes",
          sortOrder: agent["ordinal-order"] ?? Number.MAX_SAFE_INTEGER
        };
      })
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async updateSpecificDateTimeframes(
    metadata: unknown,
    timeframes: Array<{
      id: string;
      name: string;
      scope: TimeframeScope;
      type: "specific-dates";
      entries: Array<{
        startsAt: string;
        endsAt: string;
        recurrenceType: "doesNotRecur" | "custom";
        recurrenceIntervalCount?: number;
        recurrenceIntervalUnit?: "weeks" | "months";
      }>;
    }>
  ) {
    const mapping = timeframeLookupSchema.parse(metadata ?? {});

    for (const timeframe of timeframes) {
      await this.updateTimeframe(mapping, timeframe.scope, timeframe.id, {
        "update-only": "yes",
        "timeframe-specific-dates-array": timeframe.entries.map((entry) => ({
          "timeframe-specific-dates-begin-date": formatDatePart(entry.startsAt),
          "timeframe-specific-dates-begin-time": formatTimePart(entry.startsAt),
          "timeframe-specific-dates-end-date": formatDatePart(entry.endsAt),
          "timeframe-specific-dates-end-time": formatTimePart(entry.endsAt),
          "timeframe-recurrence-type": entry.recurrenceType,
          "timeframe-recurrence-custom-interval":
            entry.recurrenceType === "custom" ? entry.recurrenceIntervalUnit ?? "weeks" : "",
          "timeframe-recurrence-custom-interval-count":
            entry.recurrenceType === "custom" ? entry.recurrenceIntervalCount ?? 1 : "",
          "timeframe-recurrence-custom-interval-option": "",
          "timeframe-recurrence-end-option": "never",
          "timeframe-recurrence-end-date": ""
        }))
      });
    }

    return { ok: true };
  }

  async updateLinkedQueueMembers(args: {
    domain: string;
    callqueue: string;
    members: Array<{
      destinationNumber: string;
      displayLabel: string;
      sortOrder: number;
      enabled: boolean;
      requestConfirmationEnabled: boolean;
    }>;
  }) {
    const mapping: CoverageMapping = {
      domain: args.domain,
      callqueue: args.callqueue,
      memberMappings: [],
      agentDefaults: {
        answerConfirmationEnabled: true,
        availabilityType: "automatic",
        autoAnswerEnabled: false,
        wrapUpAllowanceSeconds: 10,
        maxActiveCallsTotal: 1,
        maxConcurrentSmsConversations: 1
      }
    };

    const currentAgents = await this.listCallqueueAgents(mapping);
    const desiredAgentIds = new Set(args.members.map((member) => normalizePhoneNumber(member.destinationNumber)));

    for (const agent of currentAgents) {
      if (!desiredAgentIds.has(agent["callqueue-agent-id"])) {
        await this.deleteCallqueueAgent(mapping, agent["callqueue-agent-id"]);
      }
    }

    for (const member of args.members.sort((left, right) => left.sortOrder - right.sortOrder)) {
      const agentId = normalizePhoneNumber(member.destinationNumber);
      const exists = currentAgents.some((agent) => agent["callqueue-agent-id"] === agentId);
      const body = {
        "callqueue-agent-availability-type": member.enabled ? "automatic" : "disabled",
        "callqueue-agent-dispatch-order-ordinal": member.sortOrder,
        "callqueue-agent-answer-confirmation-enabled": toYesNo(member.requestConfirmationEnabled),
        "auto-answer-enabled": "no",
        "callqueue-agent-wrap-up-allowance-seconds": 10,
        "limits-max-active-calls-total": 1,
        "callqueue-agent-max-concurrent-sms-conversations": 1
      };

      if (!exists) {
        await this.createCallqueueAgent(mapping, {
          "callqueue-agent-id": agentId,
          ...body
        });
        continue;
      }

      await this.updateCallqueueAgent(mapping, agentId, body);
    }

    return { ok: true };
  }

  private resolveAgentId(mapping: CoverageMapping, member: CoverageMemberPayload) {
    const normalizedNumber = normalizePhoneNumber(member.destinationNumber);
    const explicit = mapping.memberMappings.find(
      (entry) => entry.memberType === member.memberType && normalizePhoneNumber(entry.destinationNumber) === normalizedNumber
    );

    if (explicit) {
      return explicit.agentId;
    }

    if (member.memberType === "EXTERNAL_NUMBER") {
      return normalizedNumber;
    }

    throw new Error(`Missing backend member mapping for ${member.displayLabel} (${normalizedNumber})`);
  }

  async updateSchedule(_externalRef: string, payload: unknown, metadata?: unknown) {
    const mapping = scheduleMappingSchema.parse(metadata ?? {});
    const schedule = payload as ScheduleSyncPayload;
    const weeklyScope = mapping.weeklyTimeframeScope ?? (mapping.user ? "user" : "domain");
    const holidayScope = mapping.holidayTimeframeScope ?? weeklyScope;

    const weeklyTimeframeId = await this.resolveExistingTimeframeId(
      mapping,
      weeklyScope,
      mapping.weeklyTimeframeId,
      mapping.weeklyTimeframeName
    );

    await this.updateTimeframe(mapping, weeklyScope, weeklyTimeframeId, buildDayOfWeekTimeframeBody(schedule.weeklyRules));

    if (mapping.holidayTimeframeName) {
      const holidayTimeframeId = await this.resolveExistingTimeframeId(
        mapping,
        holidayScope,
        mapping.holidayTimeframeId,
        mapping.holidayTimeframeName
      );

      await this.updateTimeframe(mapping, holidayScope, holidayTimeframeId, {
        "timeframe-specific-dates-array": buildHolidayEntries(schedule.holidayClosures)
      });
    }

    if (schedule.overrides.length === 0) {
      return { ok: true };
    }

    if (!mapping.user || !mapping.overrideTimeframePrefix) {
      throw new Error("Schedule mapping must include user and overrideTimeframePrefix to sync overrides");
    }

    const overrideScope = mapping.overrideTimeframeScope ?? "user";
    const overridePrefix = mapping.overrideTimeframePrefix;
    const existingTimeframes = await this.listTimeframes(mapping, overrideScope);
    const existingRules = await this.listAnswerRules({ domain: mapping.domain, user: mapping.user });
    const managedTimeframes = existingTimeframes.filter((timeframe) =>
      timeframe["timeframe-name"]?.startsWith(overridePrefix)
    );

    for (const rule of existingRules) {
      if (rule["time-frame"]?.startsWith(overridePrefix)) {
        await this.deleteAnswerRule({ domain: mapping.domain, user: mapping.user }, rule["time-frame"]);
      }
    }

    for (const timeframe of managedTimeframes) {
      if (timeframe["timeframe-id"]) {
        await this.deleteTimeframe(mapping, overrideScope, timeframe["timeframe-id"]);
      }
    }

    for (const override of schedule.overrides) {
      const timeframeName = `${overridePrefix}:${override.label}:${formatDatePart(override.startsAt)}-${formatTimePart(
        override.startsAt
      )}`;

      await this.createTimeframe(mapping, overrideScope, {
        synchronous: true,
        "timeframe-name": timeframeName,
        "timeframe-type": "specific-dates",
        "timeframe-specific-dates-array": buildOverrideEntries(override)
      });

      await this.createAnswerRule(
        { domain: mapping.domain, user: mapping.user },
        buildOverrideRule(override, timeframeName)
      );
    }

    return { ok: true };
  }

  async updateCoverage(_externalRef: string, payload: unknown, metadata?: unknown) {
    const mapping = coverageMappingSchema.parse(metadata ?? {});
    const coverage = payload as CoverageSyncPayload;

    await this.updateCallqueue(mapping, coverage);

    const currentAgents = await this.listCallqueueAgents(mapping);
    const desiredMembers = [...coverage.members].sort((left, right) => left.sortOrder - right.sortOrder);
    const desiredAgentIds = new Set(desiredMembers.map((member) => this.resolveAgentId(mapping, member)));

    for (const agent of currentAgents) {
      if (!desiredAgentIds.has(agent["callqueue-agent-id"])) {
        await this.deleteCallqueueAgent(mapping, agent["callqueue-agent-id"]);
      }
    }

    for (const member of desiredMembers) {
      const agentId = this.resolveAgentId(mapping, member);
      const body = {
        "callqueue-agent-availability-type": member.enabled ? mapping.agentDefaults?.availabilityType ?? "automatic" : "disabled",
        "callqueue-agent-dispatch-order-ordinal": member.sortOrder,
        "callqueue-agent-answer-confirmation-enabled": toYesNo(
          mapping.agentDefaults?.answerConfirmationEnabled ?? false
        ),
        "auto-answer-enabled": toYesNo(mapping.agentDefaults?.autoAnswerEnabled ?? false),
        "callqueue-agent-wrap-up-allowance-seconds": mapping.agentDefaults?.wrapUpAllowanceSeconds ?? 0,
        "limits-max-active-calls-total": mapping.agentDefaults?.maxActiveCallsTotal ?? 1,
        "callqueue-agent-max-concurrent-sms-conversations": mapping.agentDefaults?.maxConcurrentSmsConversations ?? 1
      };

      const exists = currentAgents.some((agent) => agent["callqueue-agent-id"] === agentId);

      if (!exists) {
        await this.createCallqueueAgent(mapping, {
          "callqueue-agent-id": agentId,
          ...body
        });
        continue;
      }

      await this.updateCallqueueAgent(mapping, agentId, body);
    }

    return { ok: true };
  }
}
