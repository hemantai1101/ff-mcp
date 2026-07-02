import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FundFluentClient, machineActioner } from "../client.js";

export function registerDocumentSetTools(server: McpServer, client: FundFluentClient, companyId: string) {
  server.registerTool(
    "list_folders",
    {
      annotations: { readOnlyHint: true },
      description: "List Data Vault folders for the company.",
      inputSchema: {
        search: z.string().optional().describe("Search by name"),
        limit: z.number().optional().describe("Max results per page"),
        page: z.number().optional().describe("Page number (1-based)"),
        sort: z.string().optional().describe("Sort field. Prefix with - for descending, e.g. -updatedAt"),
      },
    },
    async ({ search, limit, page, sort }) => {
      const data = await client.doc("/document-set", {
        query: { companyId, search, limit, page, sort },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_folder",
    {
      annotations: { readOnlyHint: true },
      description: "Get details of a specific Data Vault folder.",
      inputSchema: {
        documentSetId: z.string().describe("The folder ID"),
      },
    },
    async ({ documentSetId }) => {
      const data = await client.doc(`/document-set/${documentSetId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_folder_with_documents",
    {
      annotations: { readOnlyHint: true },
      description: "Get a Data Vault folder along with all its documents.",
      inputSchema: {
        documentSetId: z.string().describe("The folder ID"),
      },
    },
    async ({ documentSetId }) => {
      const data = await client.doc(`/document-set/${documentSetId}/documents`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "create_folder",
    {
      annotations: { readOnlyHint: false },
      description: "Create a new Data Vault folder to organise documents. Optionally link it to a workspace immediately.",
      inputSchema: {
        name: z.string().describe("Name of the folder"),
        storyId: z.string().optional().describe("Workspace (story) ID to link this folder to"),
      },
    },
    async ({ name, storyId }) => {
      const data = await client.doc("/document-set", {
        method: "POST",
        body: JSON.stringify({ name, companyId, storyId, actioner: machineActioner(companyId) }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "rename_folder",
    {
      annotations: { readOnlyHint: false },
      description: "Rename a Data Vault folder.",
      inputSchema: {
        documentSetId: z.string().describe("The folder ID"),
        name: z.string().describe("New name"),
      },
    },
    async ({ documentSetId, name }) => {
      const data = await client.doc(`/document-set/${documentSetId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "add_documents_to_folder",
    {
      annotations: { readOnlyHint: false },
      description: "Add documents to a Data Vault folder.",
      inputSchema: {
        documentSetId: z.string().describe("The folder ID"),
        documentIds: z.array(z.string()).describe("Document IDs to add"),
      },
    },
    async ({ documentSetId, documentIds }) => {
      const data = await client.doc(`/document-set/${documentSetId}/add-documents`, {
        method: "PATCH",
        body: JSON.stringify({ documentIds }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "remove_documents_from_folder",
    {
      annotations: { readOnlyHint: false },
      description: "Remove documents from a Data Vault folder.",
      inputSchema: {
        documentSetId: z.string().describe("The folder ID"),
        documentIds: z.array(z.string()).describe("Document IDs to remove"),
      },
    },
    async ({ documentSetId, documentIds }) => {
      const data = await client.doc(`/document-set/${documentSetId}/remove-documents`, {
        method: "PATCH",
        body: JSON.stringify({ documentIds }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_storage_usage",
    {
      annotations: { readOnlyHint: true },
      description: "Get the company's Data Vault storage usage.",
      inputSchema: {},
    },
    async () => {
      const data = await client.doc("/document-set/storage", {
        query: { companyId },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
