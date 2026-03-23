import { z } from "zod";
import { getEnv } from "@/lib/env";
import { normalizePhoneNumber } from "@/lib/utils/phone";

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
};

type RoutingAnswerRule = {
  "time-frame"?: string;
};

type RoutingAgent = {
  "callqueue-agent-id": string;
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

function encodePath(value: string) {
  return encodeURIComponent(value);
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
        baseUrl: env.ROUTING_API_BASE_URL,
        token: env.ROUTING_API_TOKEN
      };
    })()
  ) {}

  private async request<T>(path: string, init: RequestInit) {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.config.token}`,
        ...(init.headers ?? {})
      },
      cache: "no-store"
    });

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

  private async ensureTimeframeId(
    mapping: { domain: string; user?: string },
    scope: TimeframeScope,
    timeframeId: string | undefined,
    timeframeName: string,
    createBody: Record<string, unknown>
  ) {
    if (timeframeId) {
      return timeframeId;
    }

    const existing = await this.listTimeframes(mapping, scope);
    const match = existing.find((timeframe) => timeframe["timeframe-name"] === timeframeName);

    if (match?.["timeframe-id"]) {
      return match["timeframe-id"];
    }

    const created = await this.createTimeframe(mapping, scope, createBody);

    if (!created?.["timeframe-id"]) {
      throw new Error(`Routing Engine API did not return a timeframe id for ${timeframeName}`);
    }

    return created["timeframe-id"];
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

    const weeklyTimeframeId = await this.ensureTimeframeId(mapping, weeklyScope, mapping.weeklyTimeframeId, mapping.weeklyTimeframeName, {
      synchronous: true,
      "timeframe-name": mapping.weeklyTimeframeName,
      "timeframe-type": "days-of-week",
      ...buildDayOfWeekTimeframeBody(schedule.weeklyRules)
    });

    await this.updateTimeframe(mapping, weeklyScope, weeklyTimeframeId, buildDayOfWeekTimeframeBody(schedule.weeklyRules));

    if (mapping.holidayTimeframeName) {
      const holidayTimeframeId = await this.ensureTimeframeId(
        mapping,
        holidayScope,
        mapping.holidayTimeframeId,
        mapping.holidayTimeframeName,
        {
          synchronous: true,
          "timeframe-name": mapping.holidayTimeframeName,
          "timeframe-type": "specific-dates",
          "timeframe-specific-dates-array": buildHolidayEntries(schedule.holidayClosures)
        }
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
