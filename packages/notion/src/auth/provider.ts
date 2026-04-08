import { Response } from "express";
import { Request } from "express";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { OAuthServerProvider, AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidGrantError,
  InvalidTokenError,
  UnsupportedGrantTypeError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { StatelessClientsStore, signObject, verifySignedObject } from "./clients.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

interface StatePayload {
  codeChallenge: string;
  clientRedirectUri: string;
  mcpState?: string;
  clientId: string;
}

interface AuthCodePayload {
  notionCode: string;
  codeChallenge: string;
  clientId: string;
  iat: number;
}

function getCallbackUrl(): string {
  const base = process.env.NOTION_MCP_BASE_URL?.replace(/\/$/, "") ?? "https://mcp.fluentlab.co";
  return `${base}/notion-mcp/oauth/callback`;
}

// ─── Provider ───────────────────────────────────────────────────────────────

export class NotionOAuthProvider implements OAuthServerProvider {
  readonly clientsStore = new StatelessClientsStore();

  /** Step 1: redirect the user to Notion's authorization page. */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const clientId = process.env.NOTION_CLIENT_ID;
    if (!clientId) {
      res.status(500).send("NOTION_CLIENT_ID is not configured");
      return;
    }

    // Encode MCP params in Notion's state so we can recover them in the callback
    const state: StatePayload = {
      codeChallenge: params.codeChallenge,
      clientRedirectUri: params.redirectUri,
      mcpState: params.state,
      clientId: client.client_id,
    };

    const authUrl = new URL("https://api.notion.com/v1/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("owner", "user");
    authUrl.searchParams.set("redirect_uri", getCallbackUrl());
    authUrl.searchParams.set("state", signObject(state));

    res.redirect(authUrl.toString());
  }

  /**
   * Called by Notion after the user authorizes.
   * Decodes state, creates a signed auth code, redirects to the MCP client.
   */
  async handleCallback(req: Request, res: Response): Promise<void> {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    if (error) {
      res.status(400).send(`Notion OAuth error: ${error}${error_description ? ` — ${error_description}` : ""}`);
      return;
    }
    if (!code || !state) {
      res.status(400).send("Missing code or state from Notion");
      return;
    }

    const stateData = verifySignedObject<StatePayload>(state);
    if (!stateData) {
      res.status(400).send("Invalid or tampered state parameter");
      return;
    }

    const authCodePayload: AuthCodePayload = {
      notionCode: code,
      codeChallenge: stateData.codeChallenge,
      clientId: stateData.clientId,
      iat: Math.floor(Date.now() / 1000),
    };
    const authCode = signObject(authCodePayload);

    // Redirect back to the MCP client (Claude Code)
    const redirectUrl = new URL(stateData.clientRedirectUri);
    redirectUrl.searchParams.set("code", authCode);
    if (stateData.mcpState) redirectUrl.searchParams.set("state", stateData.mcpState);

    res.redirect(redirectUrl.toString());
  }

  /** Step 3: SDK calls this to get the stored codeChallenge for PKCE verification. */
  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const data = verifySignedObject<AuthCodePayload>(authorizationCode);
    if (!data) throw new InvalidGrantError("Invalid or expired authorization code");
    return data.codeChallenge;
  }

  /** Step 4: SDK calls this after PKCE is verified. Exchange code with Notion. */
  async exchangeAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string
  ): Promise<OAuthTokens> {
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new InvalidGrantError("Notion OAuth credentials are not configured");
    }

    const data = verifySignedObject<AuthCodePayload>(authorizationCode);
    if (!data) throw new InvalidGrantError("Invalid or expired authorization code");

    // Enforce a 10-minute auth code expiry
    if (Date.now() / 1000 - data.iat > 600) {
      throw new InvalidGrantError("Authorization code has expired");
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: data.notionCode,
        redirect_uri: getCallbackUrl(),
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => "");
      throw new InvalidGrantError(`Notion token exchange failed: ${tokenRes.status} ${body}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    return {
      access_token: tokenData.access_token,
      token_type: "bearer",
      // Notion access tokens do not expire — use a far-future value so SDK middleware is satisfied
      expires_in: 100 * 365 * 24 * 60 * 60,
    };
  }

  async exchangeRefreshToken(): Promise<OAuthTokens> {
    // Notion OAuth tokens do not expire and do not support refresh tokens
    throw new UnsupportedGrantTypeError("Notion does not support refresh tokens");
  }

  /** Verify a Notion access token by calling the Notion API. */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const res = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!res.ok) {
      throw new InvalidTokenError("Invalid or revoked Notion access token");
    }

    const user = (await res.json()) as any;
    const userId =
      user?.bot?.owner?.user?.id ??
      user?.id ??
      "notion-user";

    return {
      token,
      clientId: userId,
      scopes: [],
      // Notion tokens don't expire; use far-future so requireBearerAuth middleware is satisfied
      expiresAt: Math.floor(Date.now() / 1000) + 100 * 365 * 24 * 60 * 60,
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    _request: OAuthTokenRevocationRequest
  ): Promise<void> {
    // Notion does not have a token revocation endpoint; silently succeed
  }
}
