---
description: Deploy and host static sites with Novence MCP. Use when creating projects, uploading site files, running quality checks, deploying, attaching domains, managing Novence forms and quotas, or adding third-party widgets and /data JSON files.
---

# Novence deploy

Use the Novence MCP tools (server `novence`) for static-site hosting.

Static-only is not a dead end. Improve sites with **third-party widgets** and **baked-in data files** — no plugin marketplace, no per-site server. Product: https://novence.ai/site-data

## Prerequisites

- No API key required to start. If unauthenticated, call `bootstrap(email)` — the session adopts the `nv_` key. See `SETUP.md`.
- **Claude Code plugin:** leave **Novence API key** blank until after bootstrap, then set it in plugin settings (`userConfig` / Keychain) and `/reload-plugins`. Empty `${user_config.api_key}` is unauthenticated.
- **Cursor / shell:** connect with the MCP URL only; after bootstrap, `export NOVENCE_API_KEY='nv_…'` and add env interpolation in MCP headers.

## Typical loop

1. `create_project` with a name.
2. `get_upload_urls_batch` for site paths, PUT file bodies to the presigned URLs.
3. `confirm_uploads_batch`.
4. `deploy` (optionally `force`).
5. Poll `get_deployment_status` / `get_checks_results` until published.
6. `get_preview_url` for the live URL (`https://{suffix}.novence.ai`).
7. Optional: `configure_custom_domain`, `create_form`, `get_quotas_and_usage`, `update_project_settings` (`analytics_enabled: true`) then `get_project_analytics`, `invite_project_member` (Pro/Scale owner).

## Rules

- Prefer batch upload tools for multi-file sites.
- Do not invent APIs — use the MCP tools.
- For a local HTML billing/account console, use `get_account_console_kit` / `create_account_session` (never embed `nv_` in HTML).
- Team seats: `invite_project_member` requires the **project owner** to be on Pro or Scale. Collaborators use their own keys and the existing `project_id`. `create_project` always bills the caller.

## Widgets and owner data

Prefer these over asking for a WordPress-style plugin or a per-site backend.

- **Third-party widgets:** Paste a script or iframe in HTML (Cal.com, Snipcart, Shopify Buy Button, Stripe Payment Links, GA, Formspree). Novence serves HTML as-is and does not strip tags. Never put `nv_` keys in the page.
- **Baked-in data files:** Upload `/data/{collection}.json` (`.json` is allowlisted). Page JS fetches same-origin (`fetch("/data/menu.json")`). Use for hours, menus, team, services, FAQ, inventory. Update that file and deploy. Live edits without a deploy are not available.
- Contact leads: Novence Forms (`create_form` + `action="/__forms/{formId}"`). Bookings/payments: BYO widget. Private CRM / PHP plugins: out of scope.

## Video & large media

- **Free / unverified:** video uploads (`.mp4`, `.webm`, `.mov`) are rejected. Max file size **10 MB**.
- **Pro:** video allowed, max **50 MB** per file. **Scale:** max **100 MB**.
- Prefer compressed **H.264 + AAC MP4** with moov at the front (`+faststart`). Remux/compress `.mov` before upload.
- Example:

```bash
ffmpeg -i in.mov -an -vf "scale='min(1920,iw)':-2" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 26 out.mp4
```

- Use a poster image and `preload="metadata"` on `<video>`. Mute decorative heroes (`-an`) when possible.
- Bandwidth is metered: Free hard-blocks past included GB; Pro/Scale soft-overage at $0.08/GB on the Stripe invoice.
