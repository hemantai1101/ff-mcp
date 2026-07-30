// NOTE: do not wire this export up to a deployed Cloud Function.
// send_file_upload and upload_file_to_page read files from local disk by
// path — that only means something when the server process runs on the
// same machine as the caller. Deployed remotely, every file_path would
// point at a filesystem the service can't see. Use the "local" stdio
// entrypoint (src/local.ts) only. This file exists solely so the package
// matches the rest of the monorepo's structure and build tooling.
import { createNotionFileUploadServer } from "./server.js";
import { createCloudFunctionHandler } from "@mcp/shared";

export const notionFileUploadMcp = createCloudFunctionHandler(createNotionFileUploadServer);
