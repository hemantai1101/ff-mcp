import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

export async function getSecret(secretName: string): Promise<string> {
  // Fallback to environment variable for local development (skips GCP Secret Manager)
  if (process.env[secretName]) {
    return process.env[secretName]!;
  }
  const client = new SecretManagerServiceClient();
  const name = `projects/${process.env.GCP_PROJECT_ID}/secrets/${secretName}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  return version.payload!.data!.toString();
}
