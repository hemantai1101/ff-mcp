import { createFundFluentServer } from "./server.js";
import { createCloudFunctionHandler } from "@mcp/shared";

export const fundfluentMcp = createCloudFunctionHandler(createFundFluentServer);
