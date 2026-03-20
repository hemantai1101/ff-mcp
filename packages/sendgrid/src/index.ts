import { createSendGridServer } from "./server.js";
import { createCloudFunctionHandler } from "@mcp/shared";

export const sendgridMcp = createCloudFunctionHandler(createSendGridServer);
