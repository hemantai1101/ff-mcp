import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import client from "@sendgrid/client";

const emailAddressSchema = z.object({
  email: z.string().email().describe("Email address"),
  name: z.string().optional().describe("Display name"),
});

const contentSchema = z.object({
  type: z.string().describe("MIME type, e.g. 'text/plain' or 'text/html'"),
  value: z.string().describe("Content body"),
});

const attachmentSchema = z.object({
  content: z.string().describe("Base64-encoded file content"),
  type: z.string().optional().describe("MIME type, e.g. 'application/pdf'"),
  filename: z.string().describe("Attachment filename"),
  disposition: z.enum(["attachment", "inline"]).optional().describe("'attachment' (default) or 'inline'"),
  content_id: z.string().optional().describe("Content ID for inline attachments"),
});

const personalizationSchema = z.object({
  to: z.array(emailAddressSchema).min(1).describe("List of recipients"),
  cc: z.array(emailAddressSchema).optional().describe("CC recipients"),
  bcc: z.array(emailAddressSchema).optional().describe("BCC recipients"),
  from: emailAddressSchema.optional().describe("Override the top-level from for this personalization"),
  reply_to: emailAddressSchema.optional().describe("Override reply-to for this personalization"),
  subject: z.string().optional().describe("Override subject for this personalization"),
  headers: z.record(z.string(), z.string()).optional().describe("Custom headers for this personalization"),
  dynamic_template_data: z.record(z.string(), z.unknown()).optional().describe("Handlebars template variables for this recipient"),
});

export function registerMailTools(server: McpServer) {
  server.registerTool(
    "send_email",
    {
      description:
        "Send an email via SendGrid. Supports plain text, HTML content, dynamic templates, attachments, and multiple recipients via personalizations.",
      inputSchema: {
        from: emailAddressSchema.describe("Sender email address (must be verified in SendGrid)"),
        personalizations: z
          .array(personalizationSchema)
          .min(1)
          .max(1000)
          .describe("List of recipient personalizations. Each entry defines a set of recipients and optional per-recipient overrides."),
        subject: z.string().optional().describe("Global email subject (required if not using a template or overriding per personalization)"),
        content: z
          .array(contentSchema)
          .optional()
          .describe("Email body content blocks. Use 'text/plain' and/or 'text/html'. Omit when using a dynamic template."),
        template_id: z
          .string()
          .optional()
          .describe("SendGrid dynamic template ID (e.g. d-xxxx). When set, 'content' can be omitted."),
        reply_to: emailAddressSchema.optional().describe("Reply-to address"),
        attachments: z.array(attachmentSchema).optional().describe("List of file attachments"),
        categories: z
          .array(z.string().max(255))
          .max(10)
          .optional()
          .describe("Up to 10 category tags for tracking/filtering in SendGrid"),
        send_at: z
          .number()
          .int()
          .optional()
          .describe("Unix timestamp to schedule delivery. Must be within 72 hours from now."),
        batch_id: z
          .string()
          .optional()
          .describe("Batch ID for scheduled sends (allows cancellation via cancel scheduled sends API)"),
        ip_pool_name: z.string().max(64).optional().describe("IP pool name to send from"),
        mail_settings: z
          .object({
            sandbox_mode: z
              .object({ enable: z.boolean() })
              .optional()
              .describe("Enable sandbox mode to test without delivering the email"),
          })
          .optional()
          .describe("Mail settings"),
        tracking_settings: z
          .object({
            click_tracking: z
              .object({
                enable: z.boolean(),
                enable_text: z.boolean().optional(),
              })
              .optional(),
            open_tracking: z
              .object({ enable: z.boolean() })
              .optional(),
          })
          .optional()
          .describe("Tracking settings for clicks and opens"),
      },
    },
    async ({ from, personalizations, subject, content, template_id, reply_to, attachments, categories, send_at, batch_id, ip_pool_name, mail_settings, tracking_settings }) => {
      const body: Record<string, unknown> = { from, personalizations };

      if (subject) body.subject = subject;
      if (content) body.content = content;
      if (template_id) body.template_id = template_id;
      if (reply_to) body.reply_to = reply_to;
      if (attachments) body.attachments = attachments;
      if (categories) body.categories = categories;
      if (send_at) body.send_at = send_at;
      if (batch_id) body.batch_id = batch_id;
      if (ip_pool_name) body.ip_pool_name = ip_pool_name;
      if (mail_settings) body.mail_settings = mail_settings;
      if (tracking_settings) body.tracking_settings = tracking_settings;

      const [response] = await client.request({
        method: "POST",
        url: "/v3/mail/send",
        body,
      });

      const statusCode = response.statusCode;
      if (statusCode === 202) {
        return {
          content: [{ type: "text", text: "Email accepted for delivery (202)." }],
        };
      }

      return {
        content: [{ type: "text", text: `Unexpected status: ${statusCode}` }],
      };
    }
  );
}