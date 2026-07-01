import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FundFluentClient, machineActioner } from "../client.js";

export function registerStoryTools(server: McpServer, client: FundFluentClient, companyId: string) {
  server.registerTool(
    "list_stories",
    {
      annotations: { readOnlyHint: true },
      description: "List funding application stories (workspaces) for the company. Filter by status or funding option.",
      inputSchema: {
        statuses: z.array(z.enum(["Open", "InProgress", "Closed", "Archive"])).optional()
          .describe("Filter by status"),
        fundingOptionId: z.string().optional().describe("Filter by funding option ID"),
        search: z.string().optional().describe("Search by name"),
        limit: z.number().optional().describe("Max results (default 20)"),
        page: z.number().optional().describe("Page number"),
        sort: z.string().optional().describe("Sort field, e.g. -updatedAt"),
      },
    },
    async ({ statuses, fundingOptionId, search, limit, page, sort }) => {
      const data = await client.pt("/stories", {
        query: { companyId, statuses, fundingOptionId, search, limit, page, sort },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_story",
    {
      annotations: { readOnlyHint: true },
      description: "Get a single funding application story by ID.",
      inputSchema: {
        storyId: z.string().describe("The story ID"),
      },
    },
    async ({ storyId }) => {
      const data = await client.pt(`/stories/${storyId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "create_story",
    {
      annotations: { readOnlyHint: false },
      description: "Create a new funding application story (workspace) for a funding program.",
      inputSchema: {
        name: z.string().describe("Story name"),
        fundingOptionId: z.string().optional().describe("ID of the funding option this story is for"),
        dueDate: z.string().optional().describe("Due date in ISO 8601 format"),
      },
    },
    async ({ name, fundingOptionId, dueDate }) => {
      const data = await client.pt("/stories", {
        method: "POST",
        body: JSON.stringify({
          name,
          companyId,
          fundingOptionId,
          dueDate,
          actioner: machineActioner(companyId),
        }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "update_story",
    {
      annotations: { readOnlyHint: false },
      description: "Update a funding application story's name, status, due date, or funding amounts.",
      inputSchema: {
        storyId: z.string().describe("The story ID"),
        name: z.string().optional().describe("New name"),
        status: z.enum(["Open", "InProgress", "Closed", "Archive"]).optional().describe("New status"),
        dueDate: z.string().optional().describe("Due date in ISO 8601 format"),
        appliedFundingSize: z.object({ amount: z.number(), currency: z.string() }).optional()
          .describe("Amount applied for, e.g. { amount: 50000, currency: 'HKD' }"),
        approvedFundingSize: z.object({ amount: z.number(), currency: z.string() }).optional()
          .describe("Amount approved"),
        disbursedFundingSize: z.object({ amount: z.number(), currency: z.string() }).optional()
          .describe("Amount disbursed"),
      },
    },
    async ({ storyId, name, status, dueDate, appliedFundingSize, approvedFundingSize, disbursedFundingSize }) => {
      const data = await client.pt(`/stories/${storyId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          status,
          dueDate,
          appliedFundingSize,
          approvedFundingSize,
          disbursedFundingSize,
          actioner: machineActioner(companyId),
        }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "list_story_comments",
    {
      annotations: { readOnlyHint: true },
      description: "List comments on a funding application story.",
      inputSchema: {
        storyId: z.string().describe("The story ID"),
        limit: z.number().optional(),
        page: z.number().optional(),
      },
    },
    async ({ storyId, limit, page }) => {
      const data = await client.pt(`/stories/${storyId}/comments`, {
        query: { limit, page },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "add_story_comment",
    {
      annotations: { readOnlyHint: false },
      description: "Add a comment to a funding application story.",
      inputSchema: {
        storyId: z.string().describe("The story ID"),
        content: z.string().describe("Comment text"),
      },
    },
    async ({ storyId, content }) => {
      const data = await client.pt(`/stories/${storyId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          content: { text: content },
          actioner: machineActioner(companyId),
        }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "link_folder_to_story",
    {
      annotations: { readOnlyHint: false },
      description: "Link a Data Vault folder (document set) to a workspace (story). Once linked, the workspace's Documents tab shows the folder's contents.",
      inputSchema: {
        storyId: z.string().describe("The story ID"),
        documentSetId: z.string().describe("The folder (document set) ID to link"),
      },
    },
    async ({ storyId, documentSetId }) => {
      const data = await client.pt(`/stories/${storyId}`, {
        method: "PATCH",
        body: JSON.stringify({ documentSetId, actioner: machineActioner(companyId) }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "unlink_folder_from_story",
    {
      annotations: { readOnlyHint: false },
      description: "Unlink the Data Vault folder from a workspace (story). The folder and its documents are preserved in Data Vault but detached from the workspace.",
      inputSchema: {
        storyId: z.string().describe("The story ID"),
      },
    },
    async ({ storyId }) => {
      const data = await client.pt(`/stories/${storyId}/remove-document-set`, {
        method: "PATCH",
        body: JSON.stringify({ actioner: machineActioner(companyId) }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
