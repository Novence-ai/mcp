# Novence MCP setup

Use this skill when the user installs the Novence plugin or needs an API key for MCP tools.

## Goal

Connect Claude Code (or Cursor / other MCP clients) to the hosted Novence MCP server at `https://api.novence.ai/mcp` using a Bearer `nv_` API key.

## Steps

1. Ask for the user's email if they do not already have a Novence key.
2. Call bootstrap (REST, not MCP):

```bash
curl -sS -X POST https://api.novence.ai/v1/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"email":"USER_EMAIL"}'
```

3. The response includes an `nv_…` API key. Store it with the pattern that matches the client:

### Claude Code (plugin)

Prefer plugin settings / Keychain — do **not** require a shell export.

1. Enable the Novence plugin (API key is optional at enable time).
2. After bootstrap, set **Novence API key** in the plugin config (`/plugin` → Novence → options), or pass it at install:

```bash
claude plugin install <plugin> --config api_key='nv_…'
```

3. Run `/reload-plugins` so Claude Code picks up the key if the MCP server was skipped or started while `api_key` was blank. Harmless no-op if the server was already connected with a valid key.

Sensitive values are stored in the macOS Keychain (or Claude’s protected credentials file on other platforms). The plugin MCP header uses `${user_config.api_key}`.

### Cursor / shell / other clients

```bash
export NOVENCE_API_KEY='nv_…'
```

Then use env interpolation in MCP config, e.g. `"Authorization": "Bearer ${env:NOVENCE_API_KEY}"` (Cursor) or paste the key into headers for generic clients.

4. Optionally verify the emailed OTP via REST (`POST /v1/auth/verify`) to unlock full Free quotas. Unverified keys still work with limited quotas.
5. Confirm MCP tools with `/mcp` — Novence tools such as `list_projects`, `create_project`, and `deploy` should appear.
6. Prefer the agent loop: create project → upload files → deploy → poll `get_deployment_status` until live → optional domain/forms.

## Notes

- Never put `nv_` keys in HTML or commit them to git.
- Docs: https://novence.ai/mcp
- Privacy: https://novence.ai/privacy
- Support: support@novence.ai
