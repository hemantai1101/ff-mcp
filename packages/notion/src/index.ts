import { createCloudFunctionHandler } from "@mcp/shared";
import { createNotionServer } from "./server.js";

export const notionMcp = createCloudFunctionHandler(createNotionServer);
