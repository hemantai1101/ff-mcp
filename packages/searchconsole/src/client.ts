import { google } from "googleapis";

export type GscClient = ReturnType<typeof google.searchconsole>;

export function buildGscClient(credential: string): GscClient {
  const trimmed = credential.trimStart();

  let auth: InstanceType<typeof google.auth.JWT> | InstanceType<typeof google.auth.OAuth2>;

  if (trimmed.startsWith("{")) {
    // Service account JSON — long-lived, recommended for production
    const key = JSON.parse(trimmed);
    auth = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ["https://www.googleapis.com/auth/webmasters"],
    });
  } else {
    // OAuth2 access token — short-lived, useful for testing
    const oauthClient = new google.auth.OAuth2();
    oauthClient.setCredentials({ access_token: trimmed });
    auth = oauthClient;
  }

  return google.searchconsole({ version: "v1", auth });
}
