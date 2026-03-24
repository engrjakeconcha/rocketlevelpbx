import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoutingEngineClient } from "@/services/routing-engine-client";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
}

describe("RoutingEngineClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      AUTH_SECRET: "secret",
      APP_URL: "https://rocketaischedule.jcit.digital",
      ROUTING_API_BASE_URL: "https://api.example.com",
      ROUTING_API_TOKEN: "token",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "smtp-user",
      SMTP_PASS: "smtp-pass",
      SMTP_FROM: "RocketLevel AI <voice@rocketlevel.com>",
      REDIS_URL: ""
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("maps schedule sync to timeframe and answerrule endpoints", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const body = init?.body ? JSON.parse(init.body as string) : null;

      if (url.endsWith("/domains/rocketlevel/timeframes") && init?.method === "GET") {
        return jsonResponse([]);
      }

      if (url.endsWith("/domains/rocketlevel/timeframes") && init?.method === "POST") {
        if (body?.["timeframe-name"] === "Business Hours") {
          return jsonResponse({ "timeframe-id": "weekly-tf-1", "timeframe-name": "Business Hours" });
        }

        if (body?.["timeframe-name"] === "Holiday Closures") {
          return jsonResponse({ "timeframe-id": "holiday-tf-1", "timeframe-name": "Holiday Closures" });
        }
      }

      if (url.endsWith("/domains/rocketlevel/users/101%40rocketlevel/timeframes") && init?.method === "GET") {
        return jsonResponse([]);
      }

      if (url.endsWith("/domains/rocketlevel/users/101%40rocketlevel/answerrules") && init?.method === "GET") {
        return jsonResponse([]);
      }

      if (url.endsWith("/domains/rocketlevel/users/101%40rocketlevel/timeframes") && init?.method === "POST") {
        return jsonResponse({ "timeframe-id": "override-tf-1" });
      }

      if (url.endsWith("/domains/rocketlevel/users/101%40rocketlevel/answerrules") && init?.method === "POST") {
        return jsonResponse({ code: 202 });
      }

      if (url.endsWith("/domains/rocketlevel/timeframes/holiday-tf-1") && init?.method === "PUT") {
        return jsonResponse({ code: 200 });
      }

      if (url.endsWith("/domains/rocketlevel/timeframes/weekly-tf-1") && init?.method === "PUT") {
        return jsonResponse({ code: 200 });
      }

      return jsonResponse({ code: 200 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const client = new RoutingEngineClient();
    await client.updateSchedule(
      "external-ref",
      {
        weeklyRules: [
          { dayOfWeek: 0, isOpen: false },
          { dayOfWeek: 1, isOpen: true, startTime: "08:00", endTime: "17:00" },
          { dayOfWeek: 2, isOpen: true, startTime: "08:00", endTime: "17:00" },
          { dayOfWeek: 3, isOpen: true, startTime: "08:00", endTime: "17:00" },
          { dayOfWeek: 4, isOpen: true, startTime: "08:00", endTime: "17:00" },
          { dayOfWeek: 5, isOpen: true, startTime: "08:00", endTime: "15:00" },
          { dayOfWeek: 6, isOpen: false }
        ],
        holidayClosures: [
          {
            name: "Memorial Day",
            startsAt: "2026-05-25T00:00:00.000Z",
            endsAt: "2026-05-25T23:59:00.000Z"
          }
        ],
        overrides: [
          {
            label: "Vacation",
            mode: "VACATION",
            startsAt: "2026-04-10T14:00:00.000Z",
            endsAt: "2026-04-10T22:00:00.000Z",
            targetNumber: "+15555550199"
          }
        ]
      },
      {
        domain: "rocketlevel",
        user: "101@rocketlevel",
        weeklyTimeframeName: "Business Hours",
        holidayTimeframeName: "Holiday Closures",
        overrideTimeframePrefix: "RL-AI-Override",
        weeklyTimeframeScope: "domain",
        holidayTimeframeScope: "domain",
        overrideTimeframeScope: "user"
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/domains/rocketlevel/timeframes",
      expect.objectContaining({ method: "GET" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/domains/rocketlevel/users/101%40rocketlevel/answerrules",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("requires explicit user member mappings for user coverage members", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.endsWith("/domains/rocketlevel/callqueues/6000") && init?.method === "PUT") {
          return jsonResponse({ code: 202 });
        }

        if (url.endsWith("/domains/rocketlevel/callqueues/6000/agents") && init?.method === "GET") {
          return jsonResponse([]);
        }

        return jsonResponse({ code: 200 });
      })
    );
    const client = new RoutingEngineClient();

    await expect(
      client.updateCoverage(
        "external-ref",
        {
          name: "Primary Coverage",
          members: [
            {
              displayLabel: "Primary Tech",
              memberType: "USER",
              destinationNumber: "+15555550111",
              enabled: true,
              temporaryStatus: "ACTIVE",
              sortOrder: 1
            }
          ]
        },
        {
          domain: "rocketlevel",
          callqueue: "6000"
        }
      )
    ).rejects.toThrow("Missing backend member mapping");
  });
});
