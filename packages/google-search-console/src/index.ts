import { createSearchConsoleServer } from "./server.js";
import { createCloudFunctionHandler } from "@mcp/shared";

export const googleSearchConsoleMcp = createCloudFunctionHandler(createSearchConsoleServer);
