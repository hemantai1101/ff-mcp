import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FundFluentClient, machineActioner } from "../client.js";

export function registerTaskTools(server: McpServer, client: FundFluentClient, companyId: string) {
  server.registerTool(
    "list_tasks",
    {
      annotations: { readOnlyHint: true },
      description: "List tasks for a specific story (funding application workspace).",
      inputSchema: {
        storyId: z.string().describe("The story ID to list tasks for"),
        statuses: z.array(z.enum(["Open", "InProgress", "Closed"])).optional()
          .describe("Filter by status"),
        limit: z.number().optional().describe("Max results per page"),
        page: z.number().optional().describe("Page number (1-based)"),
        sort: z.string().optional().describe("Sort field. Prefix with - for descending, e.g. -updatedAt"),
      },
    },
    async ({ storyId, statuses, limit, page, sort }) => {
      const data = await client.pt("/tasks", {
        query: { type: "Story", refId: storyId, companyId, statusList: statuses, limit, page, sort },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_task",
    {
      annotations: { readOnlyHint: true },
      description: "Get a single task by ID.",
      inputSchema: {
        taskId: z.string().describe("The task ID"),
      },
    },
    async ({ taskId }) => {
      const data = await client.pt(`/tasks/${taskId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "create_task",
    {
      annotations: { readOnlyHint: false },
      description: "Create a new task within a story (funding application workspace).",
      inputSchema: {
        storyId: z.string().describe("The story ID this task belongs to"),
        name: z.string().describe("Task name"),
        description: z.string().optional().describe("Task description"),
        status: z.enum(["Open", "InProgress", "Closed"]).default("Open").describe("Initial status"),
        priority: z.enum(["Low", "Medium", "High"]).default("Medium").describe("Task priority"),
        dueDate: z.string().optional().describe("Due date in ISO 8601 format"),
        assigneeId: z.string().optional().describe("User ID to assign the task to"),
      },
    },
    async ({ storyId, name, description, status, priority, dueDate, assigneeId }) => {
      const data = await client.pt("/tasks", {
        method: "POST",
        body: JSON.stringify({
          companyId,
          name,
          taskDescription: description,
          status,
          priority,
          dueDate,
          origin: { type: "Story", refId: storyId },
          assignee: assigneeId ? { type: "User", refId: assigneeId } : undefined,
          actioner: machineActioner(companyId),
        }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "update_task_status",
    {
      annotations: { readOnlyHint: false },
      description: "Update the status of a task.",
      inputSchema: {
        taskId: z.string().describe("The task ID"),
        status: z.enum(["Open", "InProgress", "Closed"]).describe("New status"),
      },
    },
    async ({ taskId, status }) => {
      const data = await client.pt(`/tasks/${taskId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status, actioner: machineActioner(companyId) }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "update_task_assignee",
    {
      annotations: { readOnlyHint: false },
      description: "Update the assignee of a task.",
      inputSchema: {
        taskId: z.string().describe("The task ID"),
        assigneeId: z.string().describe("User ID to assign the task to"),
      },
    },
    async ({ taskId, assigneeId }) => {
      const data = await client.pt(`/tasks/${taskId}/assignee`, {
        method: "PUT",
        body: JSON.stringify({
          assignee: { type: "User", refId: assigneeId },
          actioner: machineActioner(companyId),
        }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "delete_task",
    {
      annotations: { readOnlyHint: false },
      description: "Delete a task permanently.",
      inputSchema: {
        taskId: z.string().describe("The task ID to delete"),
      },
    },
    async ({ taskId }) => {
      await client.pt(`/tasks/${taskId}`, { method: "DELETE" });
      return { content: [{ type: "text", text: JSON.stringify({ success: true, taskId }, null, 2) }] };
    }
  );

  server.registerTool(
    "list_task_comments",
    {
      annotations: { readOnlyHint: true },
      description: "List comments on a task.",
      inputSchema: {
        taskId: z.string().describe("The task ID"),
        limit: z.number().optional().describe("Max results per page"),
        page: z.number().optional().describe("Page number (1-based)"),
      },
    },
    async ({ taskId, limit, page }) => {
      const data = await client.pt(`/tasks/${taskId}/comments`, {
        query: { limit, page },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "add_task_comment",
    {
      annotations: { readOnlyHint: false },
      description: "Add a comment to a task.",
      inputSchema: {
        taskId: z.string().describe("The task ID"),
        content: z.string().describe("Comment text"),
      },
    },
    async ({ taskId, content }) => {
      const data = await client.pt(`/tasks/${taskId}/comments`, {
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
    "list_task_action_items",
    {
      annotations: { readOnlyHint: true },
      description: "List action items (sub-tasks/checklist items) for a task.",
      inputSchema: {
        taskId: z.string().describe("The task ID"),
      },
    },
    async ({ taskId }) => {
      const data = await client.pt("/task-action-items", {
        query: { taskId, companyId },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
