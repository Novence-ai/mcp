# Novence MCP setup

Use this skill when the user installs the Novence plugin or needs an API key for MCP tools.

## Goal

Connect Claude Code (or Cursor / other MCP clients) to the hosted Novence MCP server at `https://api.novence.ai/mcp`. A Bearer `nv_` key is **not** required to start.

## Steps

1. Enable the plugin / add the MCP URL with **no API key**.
2. Ask for the user's email if they do not already have a Novence key.
3. Call MCP `bootstrap` with that email (not REST). The session adopts the `nv_` key immediately. Unverified trial still publishes; do not wait for OTP.
4. Deploy (`create_project` → upload → `deploy` → poll until live).
5. After the live URL, call `verify_email` with the emailed OTP to unlock Free quotas.
6. Persist the `nv_` key so later sessions stay authenticated:

### Claude Code (plugin)

Prefer plugin settings / Keychain — do **not** require a shell export.

1. API key is optional at enable time (leave blank).
2. After bootstrap, set **Novence API key** in the plugin config (`/plugin` → Novence → options), or pass it at install:

```bash
claude plugin install <plugin> --config api_key='nv_…'
```

3. Run `/reload-plugins` so Claude Code picks up the key. Harmless no-op if the server was already connected with a valid key.

Sensitive values are stored in the macOS Keychain (or Claude’s protected credentials file on other platforms). Empty `${user_config.api_key}` is treated as unauthenticated.

### Cursor / shell / other clients

Connect with `{ "url": "https://api.novence.ai/mcp" }` first. After bootstrap:

```bash
export NOVENCE_API_KEY='nv_…'
```

Then add `"Authorization": "Bearer ${env:NOVENCE_API_KEY}"` to the MCP config.

7. Confirm MCP tools with `/mcp` — Novence tools such as `bootstrap`, `list_projects`, `create_project`, and `deploy` should appear.
8. Prefer the agent loop: bootstrap (if needed) → create project → upload files → deploy → poll `get_deployment_status` until live → verify_email → optional domain/forms.

## Notes

- Root `.mcp.json` / `mcp.json` are Cursor-safe (URL only). After bootstrap, use `NOVENCE_API_KEY` + Bearer header. Claude plugin auth stays in Keychain / `userConfig` via `.claude-plugin/plugin.json`.
- Skill path for registries: `skills/novence-deploy` (`gh skill install Novence-ai/mcp novence-deploy` when available).
- Never put `nv_` keys in HTML or commit them to git.
- Docs: https://novence.ai/mcp
- Privacy: https://novence.ai/privacy
- Support: support@novence.ai
