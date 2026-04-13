# Playwright Remote MCP — Agent Instructions

This MCP controls a remote Chromium browser running on Google Cloud Run. Screenshots appear inline in the response. Videos and persistent screenshots are saved to a public GCS bucket.

## Artifact URL Mapping

Files saved under `/app/artifacts/` on the server are accessible via:

| Server path | Public URL |
| --- | --- |
| `/app/artifacts/<sessionId>/<filename>` | `https://storage.googleapis.com/ff-mcp-artifacts-490817/<sessionId>/<filename>` |

Files are auto-deleted after **24 hours**. Always present the public URL to the user.

---

## Session Setup (REQUIRED — do this first)

At the start of every session, call `browser_evaluate` to generate a unique session ID:

```
browser_evaluate: () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
```

Example result: `"mnxdilwp-q4hio0a0"`

**Store the returned value as your session ID** — use it in all artifact paths for this session. No directory creation is needed; GCS FUSE creates subdirectories automatically when files are written.

All artifacts go under `/app/artifacts/<sessionId>/`:
- Videos: `/app/artifacts/<sessionId>/recording.webm`
- Persistent screenshots: `/app/artifacts/<sessionId>/screenshot.png`

---

## Key Tools

### Navigation
- `browser_navigate` — go to a URL
- `browser_navigate_back` — go back
- `browser_wait_for` — wait for a selector or condition

### Viewport / Window Size
- `browser_resize` — set the browser viewport (e.g. `width: 1920, height: 1080`)
- Always resize **before** navigating if a specific dimension is needed

### Screenshot
- `browser_take_screenshot` — captures the current viewport and returns it **inline** (no GCS persistence needed for viewing)
  - Do **not** pass a `filename` parameter
  - Use `fullPage: true` only when the entire scrollable page is explicitly needed
- To **save a screenshot to GCS** (so it has a public URL), use `browser_run_code`:
  ```javascript
  async (page) => {
    await page.screenshot({ path: '/app/artifacts/<sessionId>/screenshot.png' });
    return 'https://storage.googleapis.com/ff-mcp-artifacts-490817/<sessionId>/screenshot.png';
  }
  ```

### Page Interaction
- `browser_snapshot` — accessibility tree snapshot; use this to get element refs before clicking
- `browser_click` — click an element
- `browser_type` — type into a field
- `browser_fill_form` — fill multiple form fields at once
- `browser_hover` — hover over an element
- `browser_select_option` — select a dropdown option
- `browser_press_key` — press a keyboard key
- `browser_evaluate` — run JavaScript on the page

### Inspection
- `browser_console_messages` — retrieve browser console logs
- `browser_network_requests` — retrieve network requests made by the page

### Video Recording

Use the native `browser_start_video` / `browser_stop_video` tools. Always pass the **session subdirectory path** so the video lands in GCS.

**How to record a video:**

1. Complete Session Setup (above) — have your `sessionId` ready
2. `browser_resize` — set viewport size
3. `browser_start_video` with `filename: "/app/artifacts/<sessionId>/recording.webm"` and matching `size`
4. Navigate and interact as needed
5. `browser_stop_video` — finalizes the file
6. Present the public GCS URL to the user

**Example:**
```
browser_start_video({
  filename: "/app/artifacts/550e8400-e29b-41d4-a716-446655440000/recording.webm",
  size: { width: 1280, height: 720 }
})
```

After `browser_stop_video`, the video is at:
`https://storage.googleapis.com/ff-mcp-artifacts-490817/<sessionId>/recording.webm`

---

## Recommended Workflow

1. **Session Setup** → `browser_run_code` to generate `sessionId` and create `/app/artifacts/<sessionId>/` directory
2. `browser_resize` → set viewport (e.g. 1280×720 or 1920×1080)
3. `browser_start_video` → `filename: "/app/artifacts/<sessionId>/recording.webm"` + matching size
4. `browser_navigate` → go to URL
5. `browser_snapshot` → confirm page is ready, get element refs
6. `browser_take_screenshot` → capture viewport inline (no filename needed)
7. Interact, scroll, navigate as needed
8. `browser_stop_video` → finalize recording
9. Present `https://storage.googleapis.com/ff-mcp-artifacts-490817/<sessionId>/recording.webm` to the user
