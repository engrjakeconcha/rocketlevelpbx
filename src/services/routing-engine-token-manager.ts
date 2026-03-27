import { getEnv } from "@/lib/env";

type RoutingTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
};

type RoutingTokenState = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

type RoutingAuthConfig = {
  baseUrl: string;
  staticToken?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
};

function hasCredentialAuth(config: RoutingAuthConfig) {
  return Boolean(config.clientId && config.clientSecret && config.username && config.password);
}

export class RoutingEngineTokenManager {
  private static sharedState?: RoutingTokenState;
  private static refreshPromise?: Promise<RoutingTokenState>;

  constructor(
    private readonly config = (() => {
      const env = getEnv();
      return {
        baseUrl: env.ROUTING_API_BASE_URL,
        staticToken: env.ROUTING_API_TOKEN || undefined,
        clientId: env.ROUTING_API_CLIENT_ID || undefined,
        clientSecret: env.ROUTING_API_CLIENT_SECRET || undefined,
        username: env.ROUTING_API_USERNAME || undefined,
        password: env.ROUTING_API_PASSWORD || undefined
      } satisfies RoutingAuthConfig;
    })()
  ) {}

  canRefresh() {
    return hasCredentialAuth(this.config);
  }

  async getAccessToken() {
    if (!this.canRefresh()) {
      if (!this.config.staticToken) {
        throw new Error("Routing Engine API token is not configured.");
      }

      return this.config.staticToken;
    }

    const now = Date.now();
    const currentState = RoutingEngineTokenManager.sharedState;

    if (currentState && currentState.expiresAt - 60_000 > now) {
      return currentState.accessToken;
    }

    return (await this.refresh()).accessToken;
  }

  async invalidate(token?: string) {
    const currentState = RoutingEngineTokenManager.sharedState;
    if (!currentState) {
      return;
    }

    if (!token || currentState.accessToken === token) {
      RoutingEngineTokenManager.sharedState = undefined;
    }
  }

  private async refresh() {
    if (RoutingEngineTokenManager.refreshPromise) {
      return RoutingEngineTokenManager.refreshPromise;
    }

    RoutingEngineTokenManager.refreshPromise = this.requestPasswordGrantToken();

    try {
      const nextState = await RoutingEngineTokenManager.refreshPromise;
      RoutingEngineTokenManager.sharedState = nextState;
      return nextState;
    } finally {
      RoutingEngineTokenManager.refreshPromise = undefined;
    }
  }

  private async requestPasswordGrantToken(): Promise<RoutingTokenState> {
    const response = await fetch(`${this.config.baseUrl}/tokens`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        grant_type: "password",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        username: this.config.username,
        password: this.config.password
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Routing Engine token refresh failed: ${response.status} ${body}`);
    }

    const payload = (await response.json()) as RoutingTokenResponse;
    const expiresInSeconds = payload.expires_in ?? 3600;

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: Date.now() + expiresInSeconds * 1000
    };
  }
}
