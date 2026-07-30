import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NotionClient } from "../client.js";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".html": "text/html",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
};

function guessContentType(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

async function createAndSendUpload(client: NotionClient, filePath: string) {
  const filename = path.basename(filePath);
  const contentType = guessContentType(filePath);

  const created = await client.request("POST", "/file_uploads", {
    json: { filename, content_type: contentType, mode: "single_part" },
  });

  const buffer = await readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: contentType }), filename);
  await client.request("POST", `/file_uploads/${created.id}/send`, { form });

  return { fileUploadId: created.id as string, filename };
}

export function registerFileUploadTools(server: McpServer, client: NotionClient) {
  server.registerTool(
    "create_file_upload",
    {
      annotations: { readOnlyHint: false },
      description:
        "Start a Notion file upload session (single-part mode, files up to 20MB). Returns a file_upload id and status of 'pending'. Call send_file_upload next with a local file path to actually transmit the bytes.",
      inputSchema: {
        filename: z.string().describe("Filename to associate with the upload, e.g. 'sample.png'"),
        content_type: z
          .string()
          .optional()
          .describe("MIME type, e.g. 'image/png'. Inferred from the filename extension if omitted."),
      },
    },
    async ({ filename, content_type }) => {
      const body = await client.request("POST", "/file_uploads", {
        json: { filename, content_type: content_type ?? guessContentType(filename), mode: "single_part" },
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "send_file_upload",
    {
      annotations: { readOnlyHint: false },
      description:
        "Read a local file from this machine's filesystem and send its bytes to complete a pending Notion file upload created by create_file_upload. This is the operation that requires the MCP server to run locally with access to the file — it will fail if the path isn't reachable from wherever this server process is running.",
      inputSchema: {
        file_upload_id: z.string().describe("The id returned by create_file_upload"),
        file_path: z.string().describe("Absolute path to the local file to upload"),
      },
    },
    async ({ file_upload_id, file_path }) => {
      const buffer = await readFile(file_path);
      const form = new FormData();
      form.append("file", new Blob([buffer], { type: guessContentType(file_path) }), path.basename(file_path));
      const body = await client.request("POST", `/file_uploads/${file_upload_id}/send`, { form });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "attach_file_to_page_property",
    {
      annotations: { readOnlyHint: false },
      description:
        "Set a Notion page's 'files'-type property to reference a completed file_upload (status 'uploaded'). This REPLACES the property's current value with this single file rather than appending alongside whatever is already there.",
      inputSchema: {
        page_id: z.string().describe("The Notion page id"),
        property_name: z.string().describe("Name of the 'files'-type property on that page, e.g. 'Sample'"),
        file_upload_id: z.string().describe("The id of a file_upload with status 'uploaded'"),
        filename: z.string().describe("Display filename for the attached file"),
      },
    },
    async ({ page_id, property_name, file_upload_id, filename }) => {
      const body = await client.request("PATCH", `/pages/${page_id}`, {
        json: {
          properties: {
            [property_name]: {
              type: "files",
              files: [{ type: "file_upload", file_upload: { id: file_upload_id }, name: filename }],
            },
          },
        },
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "append_file_block_to_page",
    {
      annotations: { readOnlyHint: false },
      description:
        "Append a completed file_upload (status 'uploaded') to a Notion page's body as a block. Use block_type 'image' for pictures (renders inline) or 'file' for anything else.",
      inputSchema: {
        page_id: z.string().describe("The Notion page id (used as the parent block id)"),
        file_upload_id: z.string().describe("The id of a file_upload with status 'uploaded'"),
        block_type: z.enum(["image", "file"]).optional().describe("Block type to append. Defaults to 'image'."),
        caption: z.string().optional().describe("Optional caption text for the block"),
      },
    },
    async ({ page_id, file_upload_id, block_type, caption }) => {
      const type = block_type ?? "image";
      const blockBody: Record<string, unknown> = { type: "file_upload", file_upload: { id: file_upload_id } };
      if (caption) blockBody.caption = [{ type: "text", text: { content: caption } }];
      const body = await client.request("PATCH", `/blocks/${page_id}/children`, {
        json: { children: [{ type, [type]: blockBody }] },
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "upload_file_to_page",
    {
      annotations: { readOnlyHint: false },
      description:
        "Convenience tool for the common case: reads a local file, uploads it to Notion, and attaches it to a page in one call. If property_name is given, sets that 'files'-type property (replacing its current value). Otherwise appends the file as an image block to the end of the page body.",
      inputSchema: {
        file_path: z.string().describe("Absolute path to the local file to upload"),
        page_id: z.string().describe("The Notion page id to attach the file to"),
        property_name: z
          .string()
          .optional()
          .describe(
            "If set, the 'files'-type property to set on the page (e.g. 'Sample'). If omitted, the file is appended to the page body instead."
          ),
        caption: z.string().optional().describe("Optional caption when appending to the page body (ignored if property_name is set)"),
      },
    },
    async ({ file_path, page_id, property_name, caption }) => {
      const { fileUploadId, filename } = await createAndSendUpload(client, file_path);

      let result: unknown;
      let attachedTo: string;
      if (property_name) {
        result = await client.request("PATCH", `/pages/${page_id}`, {
          json: {
            properties: {
              [property_name]: {
                type: "files",
                files: [{ type: "file_upload", file_upload: { id: fileUploadId }, name: filename }],
              },
            },
          },
        });
        attachedTo = `property:${property_name}`;
      } else {
        const blockBody: Record<string, unknown> = { type: "file_upload", file_upload: { id: fileUploadId } };
        if (caption) blockBody.caption = [{ type: "text", text: { content: caption } }];
        result = await client.request("PATCH", `/blocks/${page_id}/children`, {
          json: { children: [{ type: "image", image: blockBody }] },
        });
        attachedTo = "page body";
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ file_upload_id: fileUploadId, filename, attached_to: attachedTo, result }, null, 2),
          },
        ],
      };
    }
  );
}
