import crypto from "crypto";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";

export function getAuthSecret(): string {
  return process.env.MCP_AUTH_SECRET ?? "dev-secret-change-in-production";
}

function hmacSign(payload: string): string {
  return crypto.createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function verifyHmac(payload: string, sig: string): boolean {
  const expected = hmacSign(payload);
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"));
  } catch {
    return false;
  }
}

/** Signs an arbitrary object and returns a tamper-proof token: payload.sig */
export function signObject(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = hmacSign(payload);
  return `${payload}.${sig}`;
}

/** Decodes and verifies a signed token. Returns null if invalid. */
export function verifySignedObject<T = unknown>(token: string): T | null {
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const payload = token.substring(0, dotIdx);
  const sig = token.substring(dotIdx + 1);
  if (!verifyHmac(payload, sig)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

/**
 * Stateless client registration store.
 * Client IDs are signed JWTs containing the full client metadata — no storage needed.
 */
export class StatelessClientsStore implements OAuthRegisteredClientsStore {
  getClient(clientId: string): OAuthClientInformationFull | undefined {
    const data = verifySignedObject<Omit<OAuthClientInformationFull, "client_id">>(clientId);
    if (!data) return undefined;
    return { ...data, client_id: clientId } as OAuthClientInformationFull;
  }

  registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
  ): OAuthClientInformationFull {
    const now = Math.floor(Date.now() / 1000);
    const data = { ...client, client_id_issued_at: now };
    const client_id = signObject(data);
    return { ...data, client_id };
  }
}
