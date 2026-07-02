import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FundFluentClient, machineActioner } from "../client.js";

const DOCUMENT_CATEGORIES = [
  "ApplicationForm", "BusinessProposal", "PitchDeck", "CompanyRegistration",
  "IdentityProof", "OwnershipStructure", "TeamProfile", "FinancialReport",
  "FundingRecord", "ProcurementRecord", "ServiceContract", "LocalEntity",
  "RDMaterial", "IPDocument", "ProductBrochure", "MediaFile", "WebsiteProof",
  "PlatformSetup", "HiringRecord", "ProgressReport", "AuditReport",
  "EventEvidence", "Others",
] as const;

export function registerDocumentTools(server: McpServer, client: FundFluentClient, companyId: string) {
  server.registerTool(
    "create_document",
    {
      annotations: { readOnlyHint: false },
      description: "Create a document placeholder record in the Data Vault (no file upload — use the frontend to attach the actual file). Useful for pre-populating required documents for a funding application.",
      inputSchema: {
        documentName: z.string().describe("Display name for the document, e.g. 'Business Registration Certificate.pdf'"),
        type: z.string().describe("Document type, e.g. 'HongKongBR', 'BankStatement', 'FinancialReport', 'PitchDeck'. Use get_document_types to see all valid values."),
        category: z.enum(DOCUMENT_CATEGORIES).optional()
          .describe("Document category for organisation, e.g. 'CompanyRegistration', 'FinancialReport', 'PitchDeck'"),
      },
    },
    async ({ documentName, type, category }) => {
      const data = await client.doc("/documents", {
        method: "POST",
        body: JSON.stringify({
          companyId,
          documentName,
          originalFilename: documentName,
          type,
          category,
          actioner: machineActioner(companyId),
        }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "list_documents",
    {
      annotations: { readOnlyHint: true },
      description: "List documents uploaded by the company. Filter by status, type, or category.",
      inputSchema: {
        statuses: z.array(z.enum(["Initialized", "Uploaded", "Processed", "Valid", "Invalid", "Deleted"])).optional()
          .describe("Filter by document status"),
        types: z.array(z.string()).optional()
          .describe("Filter by document type, e.g. ['BankStatement', 'HongKongBR', 'FinancialReport']"),
        category: z.string().optional()
          .describe("Filter by category, e.g. 'FinancialReport', 'CompanyRegistration', 'IdentityProof'"),
        search: z.string().optional().describe("Search by document name"),
        limit: z.number().optional().describe("Max results per page"),
        page: z.number().optional().describe("Page number (1-based)"),
        sort: z.string().optional().describe("Sort field. Prefix with - for descending, e.g. -updatedAt"),
      },
    },
    async ({ statuses, types, category, search, limit, page, sort }) => {
      const data = await client.doc("/documents", {
        query: { companyId, statuses, types, category, search, limit, page, sort },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_document",
    {
      annotations: { readOnlyHint: true },
      description: "Get details of a specific document.",
      inputSchema: {
        documentId: z.string().describe("The document ID"),
      },
    },
    async ({ documentId }) => {
      const data = await client.doc(`/documents/${documentId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_document_download_url",
    {
      annotations: { readOnlyHint: true },
      description: "Get a signed download URL for a document.",
      inputSchema: {
        documentId: z.string().describe("The document ID"),
      },
    },
    async ({ documentId }) => {
      const data = await client.doc(`/documents/${documentId}/download`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "update_document_type",
    {
      annotations: { readOnlyHint: false },
      description: "Update the type/classification of a document.",
      inputSchema: {
        documentId: z.string().describe("The document ID"),
        type: z.string().describe("New document type, e.g. 'BankStatement', 'HongKongBR', 'FinancialReport'"),
      },
    },
    async ({ documentId, type }) => {
      const data = await client.doc(`/documents/${documentId}/type`, {
        method: "PUT",
        body: JSON.stringify({ type }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_document_statuses",
    {
      annotations: { readOnlyHint: true },
      description: "Get all available document statuses.",
      inputSchema: {},
    },
    async () => {
      const data = await client.doc("/documents/status");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_document_types",
    {
      annotations: { readOnlyHint: true },
      description: "Get all available document types that can be used when classifying a document.",
      inputSchema: {},
    },
    async () => {
      const data = await client.doc("/documents/document-types");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
