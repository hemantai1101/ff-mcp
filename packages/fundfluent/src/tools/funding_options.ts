import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FundFluentClient } from "../client.js";

export function registerFundingOptionTools(server: McpServer, client: FundFluentClient) {
  server.registerTool(
    "list_funding_options",
    {
      annotations: { readOnlyHint: true },
      description:
        "Discover funding programs (grants, loans, government schemes). Filter by location (e.g. Hong Kong), entity type, category, difficulty, or search by name.",
      inputSchema: {
        locations: z.array(z.enum(["Hong Kong", "Singapore", "Australia", "UK", "Canada", "Japan", "Taiwan"])).optional()
          .describe("Filter by location. Valid values: 'Hong Kong', 'Singapore', 'Australia', 'UK', 'Canada', 'Japan', 'Taiwan'"),
        entityTypes: z.array(z.string()).optional()
          .describe("Filter by entity type: 'Startups', 'Commercial Businesses', 'NGO/NPO/Social Enterprise'"),
        category: z.string().optional()
          .describe("Filter by category, e.g. 'Startup Support', 'Technology & Innovation', 'ESG / Sustainability', 'R&D and Prototyping', 'Hiring & Training', 'Digital Transformation', 'Business Expansion'"),
        difficultyLevel: z.string().optional()
          .describe("Filter by difficulty: 'Beginner', 'Intermediate', 'Advanced'"),
        search: z.string().optional().describe("Full-text search by name or description"),
        trending: z.boolean().optional().describe("Show only trending programs"),
        status: z.enum(["Draft", "Active"]).optional().describe("Filter by status (default: Active)"),
        hasEligibilityJSON: z.boolean().optional().describe("Only programs with eligibility criteria documents"),
        hasCheatSheetJSON: z.boolean().optional().describe("Only programs with cheat sheets"),
        hasPlaybookMarkdownTXT: z.boolean().optional().describe("Only programs with playbook guides"),
        limit: z.number().optional().describe("Max results (default 20)"),
        page: z.number().optional().describe("Page number (1-based)"),
        sort: z.string().optional().describe("Sort field. Prefix with - for descending, e.g. -updatedAt"),
      },
    },
    async ({ locations, entityTypes, category, difficultyLevel, search, trending, status, hasEligibilityJSON, hasCheatSheetJSON, hasPlaybookMarkdownTXT, limit, page, sort }) => {
      const data = await client.fo("/v2/funding-options", {
        query: { locations, entityTypes, category, difficultyLevel, search, trending, status, hasEligibilityJSON, hasCheatSheetJSON, hasPlaybookMarkdownTXT, limit, page, sort },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_funding_option",
    {
      annotations: { readOnlyHint: true },
      description: "Get full details of a funding program by ID.",
      inputSchema: {
        fundingOptionId: z.string().describe("The funding option ID"),
      },
    },
    async ({ fundingOptionId }) => {
      const data = await client.fo(`/v2/funding-options/${fundingOptionId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_funding_option_by_slug",
    {
      annotations: { readOnlyHint: true },
      description: "Get full details of a funding program by its slug (URL-friendly name).",
      inputSchema: {
        slug: z.string().describe("The funding option slug, e.g. 'hk-innovation-and-technology-fund'"),
      },
    },
    async ({ slug }) => {
      const data = await client.fo(`/v2/funding-options/slug/${slug}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_similar_funding_options",
    {
      annotations: { readOnlyHint: true },
      description: "Get funding programs similar to a given program.",
      inputSchema: {
        slug: z.string().describe("The slug of the reference funding program"),
        limit: z.number().optional().describe("Max results (default 6)"),
        page: z.number().optional(),
      },
    },
    async ({ slug, limit, page }) => {
      const data = await client.fo(`/v2/funding-options/slug/${slug}/similar`, {
        query: { page, limit },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
