# @mcp/notion-file-upload

Wraps Notion's [File Upload API](https://developers.notion.com/reference/file-upload) so a local file can be
uploaded and attached to a Notion page — either into a `files`-type property or as a block in the page body.

## Why this exists, and why it must stay local

Notion's own hosted MCP (and the `@mcp/notion` package in this repo) can read/write pages, but neither can move
the bytes of a file that only exists on your machine — they have no way to reach your local filesystem.

This package is **local-only by design**. `send_file_upload` and `upload_file_to_page` take a `file_path` and read
it directly off disk with `node:fs`. That only works because the server process itself runs on the same machine
as the file. **Do not deploy this to Cloud Functions** the way the other packages here are deployed — a remote
instance would have no access to whatever `file_path` it's given, and every upload would fail. `src/index.ts`
exists only so this package matches the monorepo's build tooling; it is not meant to be wired up to a deployment
workflow.

Run it via the `local` script (stdio transport) only.

## Setup

1. Create a Notion **internal integration** at https://www.notion.so/my-integrations (not the same as the OAuth
   app behind `mcp.notion.com` or `@mcp/notion`'s auth — this needs a plain integration token).
2. Share the databases/pages you want to write to with that integration (the page's `•••` menu → Connections →
   add the integration). For the Leasesify email-content workflow, that's at minimum the **Platform
   Communication** database.
3. Set the token as `NOTION_FILE_UPLOAD_TOKEN` in your `.mcp.json` entry (see below) — not in a committed file.

## `.mcp.json` entry

```json
{
  "notion-file-upload": {
    "type": "stdio",
    "command": "pnpm",
    "args": ["--filter", "@mcp/notion-file-upload", "run", "local"],
    "env": {
      "NOTION_FILE_UPLOAD_TOKEN": "ntn_your_token_here"
    }
  }
}
```

## Tools

| Tool | Purpose |
|---|---|
| `create_file_upload` | Start an upload session (single-part, ≤20MB). Returns a `file_upload` id. |
| `send_file_upload` | Read a local file and send its bytes to complete a pending upload. |
| `attach_file_to_page_property` | Set a page's `files`-type property to a completed upload (replaces the property's value). |
| `append_file_block_to_page` | Append a completed upload to the page body as an image or file block. |
| `upload_file_to_page` | Convenience: does all of the above in one call — the tool to reach for in the common case. |

## Notion API version

Uses `Notion-Version: 2026-03-11`, the version the File Upload API requires as of writing. If Notion ships a
breaking change to this API, bump the constant in `src/client.ts`.
