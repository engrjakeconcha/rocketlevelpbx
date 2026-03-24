import { getEnv } from "@/lib/env";

type MakeScenarioSummary = {
  id: number;
  name: string;
  teamId: number | null;
  isActive: boolean;
  lastEdit: string | null;
  scheduling?: {
    type?: string;
    interval?: number;
  } | null;
};

type MakeTrigger = {
  id: number | null;
  name: string | null;
  type: string | null;
  typeName: string | null;
  url: string | null;
};

export function normalizeMakeScenarioId(value: string) {
  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/\/scenarios\/(\d+)/i);
  return match?.[1] ?? trimmed;
}

export class MakeApiService {
  private readonly env = getEnv();

  private get baseUrl() {
    if (!this.env.MAKE_API_BASE_URL) {
      throw new Error("MAKE_API_BASE_URL is not configured");
    }

    return this.env.MAKE_API_BASE_URL.replace(/\/$/, "");
  }

  private get token() {
    if (!this.env.MAKE_API_TOKEN) {
      throw new Error("MAKE_API_TOKEN is not configured");
    }

    return this.env.MAKE_API_TOKEN;
  }

  private async request<T>(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Token ${this.token}`,
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Make API request failed (${response.status}): ${text || response.statusText}`);
    }

    return (await response.json()) as T;
  }

  async verifyScenario(rawScenarioId: string) {
    const scenarioId = normalizeMakeScenarioId(rawScenarioId);

    if (!/^\d+$/.test(scenarioId)) {
      throw new Error("Scenario ID must be a numeric Make scenario ID or a full Make scenario URL");
    }

    const [details, triggerData] = await Promise.all([
      this.request<{ scenario?: Record<string, unknown> }>(`/scenarios/${scenarioId}`),
      this.request<Record<string, unknown> | Array<Record<string, unknown>>>(`/scenarios/${scenarioId}/triggers`).catch(() => null)
    ]);

    const scenario = details.scenario ?? {};
    const triggersSource = Array.isArray(triggerData) ? triggerData : triggerData ? [triggerData] : [];
    const triggers: MakeTrigger[] = triggersSource.map((trigger) => ({
      id: typeof trigger.id === "number" ? trigger.id : null,
      name: typeof trigger.name === "string" ? trigger.name : null,
      type: typeof trigger.type === "string" ? trigger.type : null,
      typeName: typeof trigger.typeName === "string" ? trigger.typeName : null,
      url: typeof trigger.url === "string" ? trigger.url : null
    }));

    const summary: MakeScenarioSummary = {
      id: typeof scenario.id === "number" ? scenario.id : Number(scenarioId),
      name: typeof scenario.name === "string" ? scenario.name : `Scenario ${scenarioId}`,
      teamId: typeof scenario.teamId === "number" ? scenario.teamId : null,
      isActive: Boolean(scenario.isActive),
      lastEdit: typeof scenario.lastEdit === "string" ? scenario.lastEdit : null,
      scheduling:
        scenario.scheduling && typeof scenario.scheduling === "object"
          ? {
              type:
                "type" in scenario.scheduling && typeof scenario.scheduling.type === "string"
                  ? scenario.scheduling.type
                  : undefined,
              interval:
                "interval" in scenario.scheduling && typeof scenario.scheduling.interval === "number"
                  ? scenario.scheduling.interval
                  : undefined
            }
          : null
    };

    return {
      normalizedScenarioId: scenarioId,
      scenario: summary,
      triggers
    };
  }
}
