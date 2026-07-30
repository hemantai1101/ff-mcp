const NOTION_VERSION = "2026-03-11";
const BASE_URL = "https://api.notion.com/v1";

export interface NotionRequestOptions {
  json?: unknown;
  form?: FormData;
}

export function createNotionClient(apiKey: string) {
  async function request(method: string, path: string, opts: NotionRequestOptions = {}): Promise<any> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": NOTION_VERSION,
    };

    let body: BodyInit | undefined;
    if (opts.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.json);
    } else if (opts.form) {
      // Do not set Content-Type here — fetch derives the multipart boundary
      // from the FormData instance itself.
      body = opts.form;
    }

    const res = await fetch(`${BASE_URL}${path}`, { method, headers, body });
    const text = await res.text();
    let parsed: any;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    if (!res.ok) {
      const message = parsed?.message ?? parsed?.raw ?? res.statusText;
      const code = parsed?.code ? ` [${parsed.code}]` : "";
      throw new Error(`Notion API error ${res.status}${code}: ${message}`);
    }

    return parsed;
  }

  return { request };
}

export type NotionClient = ReturnType<typeof createNotionClient>;
