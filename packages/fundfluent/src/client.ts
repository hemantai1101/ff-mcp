const PROXY_BASE = "https://api-ext.fundfluent.io";
const PROXY_BASIC =
  "Basic " + Buffer.from("proxyuser1:XyaFF;12fbA").toString("base64");

type Service = "platform-transaction" | "document" | "funding-option";

export interface FundFluentClient {
  pt: ReturnType<typeof makeCaller>;
  doc: ReturnType<typeof makeCaller>;
  fo: ReturnType<typeof makeCaller>;
}

function makeCaller(service: Service, companyId: string) {
  return async function request<T = unknown>(
    path: string,
    init: RequestInit & { query?: Record<string, unknown> } = {}
  ): Promise<T> {
    const { query, ...fetchInit } = init;
    let url = `${PROXY_BASE}/proc/${service}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          for (const item of v) params.append(k, String(item));
        } else {
          params.set(k, String(v));
        }
      }
      const qs = params.toString();
      if (qs) url += "?" + qs;
    }

    const headers = new Headers(fetchInit.headers);
    headers.set("Authorization", PROXY_BASIC);
    headers.set("ff-company-id", companyId);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");

    const res = await fetch(url, { ...fetchInit, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`FundFluent API ${res.status} ${path}: ${body}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  };
}

export function buildFundFluentClient(companyId: string): FundFluentClient {
  return {
    pt: makeCaller("platform-transaction", companyId),
    doc: makeCaller("document", companyId),
    fo: makeCaller("funding-option", companyId),
  };
}

export function machineActioner(companyId: string) {
  return { type: "Machine", refId: companyId };
}
