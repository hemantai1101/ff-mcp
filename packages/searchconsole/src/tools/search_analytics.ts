import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GscClient } from "../client.js";

const DimensionEnum = z.enum(["query", "page", "country", "device", "date", "searchAppearance"]);
const SearchTypeEnum = z.enum(["web", "image", "video", "news", "discover", "googleNews"]);

const DimensionFilterSchema = z.object({
  dimension: DimensionEnum,
  operator: z.enum(["contains", "equals", "notContains", "notEquals", "includingRegex", "excludingRegex"]),
  expression: z.string().describe("The filter value to match"),
});

export function registerSearchAnalyticsTools(server: McpServer, gsc: GscClient): void {
  server.registerTool(
    "query_search_analytics",
    {
      description:
        "Query Google Search Console performance data. Returns clicks, impressions, CTR, and average position. " +
        "Group results by dimensions (query, page, country, device, date) and filter by any dimension value. " +
        "Supports up to 16 months of historical data.",
      inputSchema: {
        site_url: z.string().describe(
          "Verified Search Console property URL, e.g. 'https://example.com/' or 'sc-domain:example.com'"
        ),
        start_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Start date in YYYY-MM-DD format"),
        end_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("End date in YYYY-MM-DD format"),
        dimensions: z
          .array(DimensionEnum)
          .optional()
          .describe(
            "Group results by these dimensions. Options: query, page, country, device, date, searchAppearance. " +
              "Omit to get aggregate totals only."
          ),
        search_type: SearchTypeEnum.optional().describe(
          "Filter by search type. Options: web, image, video, news, discover, googleNews. Default: web"
        ),
        dimension_filter_groups: z
          .array(
            z.object({
              filters: z.array(DimensionFilterSchema).describe("Filters to apply"),
            })
          )
          .optional()
          .describe("Filter results by dimension values. Filters within a group are ANDed together."),
        row_limit: z
          .number()
          .int()
          .min(1)
          .max(25000)
          .optional()
          .describe("Maximum rows to return (1–25000). Default: 1000"),
        start_row: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Zero-based row offset for pagination. Default: 0"),
        data_state: z
          .enum(["all", "final"])
          .optional()
          .describe(
            "'all' includes fresh unconfirmed data; 'final' is confirmed data only. Default: final"
          ),
        aggregation_type: z
          .enum(["auto", "byPage", "byProperty", "byNewsShowcasePanel"])
          .optional()
          .describe("How to aggregate data when page dimension is used. Default: auto"),
      },
    },
    async ({
      site_url,
      start_date,
      end_date,
      dimensions,
      search_type,
      dimension_filter_groups,
      row_limit,
      start_row,
      data_state,
      aggregation_type,
    }) => {
      const response = await gsc.searchanalytics.query({
        siteUrl: site_url,
        requestBody: {
          startDate: start_date,
          endDate: end_date,
          dimensions: dimensions ?? [],
          searchType: search_type ?? "web",
          dimensionFilterGroups: dimension_filter_groups?.map((g) => ({
            groupType: "and",
            filters: g.filters.map((f) => ({
              dimension: f.dimension,
              operator: f.operator,
              expression: f.expression,
            })),
          })),
          rowLimit: row_limit ?? 1000,
          startRow: start_row ?? 0,
          dataState: data_state ?? "final",
          aggregationType: aggregation_type,
        },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
      };
    }
  );
}
