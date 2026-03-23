import { getEnv } from "@/lib/env";

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

    return (await response.json()) as T;
  }

  updateSchedule(externalRef: string, payload: unknown) {
    return this.request(`/schedules/${externalRef}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  updateCoverage(externalRef: string, payload: unknown) {
    return this.request(`/coverage-groups/${externalRef}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }
}
