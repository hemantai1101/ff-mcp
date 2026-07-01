import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FundFluentClient, machineActioner } from "../client.js";

export function registerCommentTools(server: McpServer, client: FundFluentClient, companyId: string) {
  server.registerTool(
    "list_comments",
    {
      annotations: { readOnlyHint: true },
      description: "List comments across stories and tasks. Filter by story ID, task ID, or origin type.",
      inputSchema: {
        storyId: z.string().optional().describe("Filter by story ID"),
        taskId: z.string().optional().describe("Filter by task ID"),
        originType: z.enum(["Story", "Task"]).optional().describe("Filter by origin type"),
        search: z.string().optional().describe("Search by comment text"),
        limit: z.number().optional().describe("Max results per page"),
        page: z.number().optional().describe("Page number (1-based)"),
        sort: z.string().optional().describe("Sort field. Prefix with - for descending, e.g. -updatedAt"),
      },
    },
    async ({ storyId, taskId, originType, search, limit, page, sort }) => {
      const data = await client.pt("/comments", {
        query: { storyId, taskId, originType, search, limit, page, sort },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "create_comment",
    {
      annotations: { readOnlyHint: false },
      description: "Create a comment on a story or task.",
      inputSchema: {
        originType: z.enum(["Story", "Task"]).describe("Whether this is a comment on a Story or Task"),
        originId: z.string().describe("The ID of the story or task"),
        content: z.string().describe("Comment text"),
      },
    },
    async ({ originType, originId, content }) => {
      const data = await client.pt("/comments", {
        method: "POST",
        body: JSON.stringify({
          origin: { type: originType, refId: originId },
          content: { text: content },
          actioner: machineActioner(companyId),
        }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "update_comment",
    {
      annotations: { readOnlyHint: false },
      description: "Update the text of an existing comment.",
      inputSchema: {
        commentId: z.string().describe("The comment ID"),
        content: z.string().describe("New comment text"),
      },
    },
    async ({ commentId, content }) => {
      const data = await client.pt(`/comments/${commentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          content: { text: content },
          actioner: machineActioner(companyId),
        }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "delete_comment",
    {
      annotations: { readOnlyHint: false },
      description: "Delete a comment.",
      inputSchema: {
        commentId: z.string().describe("The comment ID"),
      },
    },
    async ({ commentId }) => {
      await client.pt(`/comments/${commentId}`, {
        method: "DELETE",
        body: JSON.stringify({ actioner: machineActioner(companyId) }),
      });
      return { content: [{ type: "text", text: JSON.stringify({ success: true, commentId }, null, 2) }] };
    }
  );
}
