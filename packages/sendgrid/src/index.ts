import { createSendGridServer } from "./server.js";
import { createCloudFunctionHandler } from "@mcp/shared";

// Initialise once on cold start, reuse across invocations
let handler: ReturnType<typeof createCloudFunctionHandler> | null = null;

export const sendgridMcp = async (req: any, res: any) => {
  if (!handler) {
    const server = await createSendGridServer();
    handler = createCloudFunctionHandler(server);
  }
  return handler(req, res);
};
