/** Public tool catalog for directory introspection. No API internals. */
export const catalogVersion = "0.1.3";

const emptyObject = { type: "object", properties: {} };

function projectId(extra = "from create_project or list_projects") {
  return {
    type: "string",
    format: "uuid",
    description: `Hosting project UUID ${extra}.`,
  };
}

function deploymentId() {
  return {
    type: "string",
    format: "uuid",
    description:
      "Specific deployment UUID. Omit to use the project's latest deployment.",
  };
}

function sitePath() {
  return {
    type: "string",
    description:
      "Site-relative path (e.g. index.html or css/app.css). No leading slash required.",
  };
}

function contentType() {
  return {
    type: "string",
    description:
      "MIME type for the file. Optional; inferred from the path extension when omitted.",
  };
}

function emailField(text) {
  return { type: "string", format: "email", description: text };
}

const formFieldItems = {
  type: "object",
  properties: {
    name: { type: "string", description: "HTML field name submitted with the form." },
    type: {
      type: "string",
      enum: [
        "text",
        "email",
        "tel",
        "url",
        "textarea",
        "number",
        "select",
        "checkbox",
        "hidden",
      ],
      description: "Input type rendered in the hosted form.",
    },
    required: { type: "boolean", description: "Whether the visitor must fill this field." },
    label: { type: "string", description: "Visible label. Defaults to name if omitted." },
    options: {
      type: "array",
      items: { type: "string" },
      description: "Choices for type=select.",
    },
  },
};

const read = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const write = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};
const writeWorld = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};
const destroy = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

export const tools = [
  {
    name: "bootstrap",
    title: "Bootstrap account",
    description:
      "Create an account + nv_ API key from an email. No Bearer key required. Unverified trial still publishes; OTP/verify_email is AFTER the live URL. Returns apiKey immediately — do not wait for OTP.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        email: emailField("Account email. Receives the OTP after the first live URL."),
      },
      required: ["email"],
    },
  },
  {
    name: "verify_email",
    title: "Verify email",
    description:
      "Confirm the email OTP (15 min TTL). No Bearer key required. Call after the first live URL, before checkout/mpp_upgrade.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        email: emailField("Same email used with bootstrap."),
        code: {
          type: "string",
          description: "One-time code from the verification email (about 15 minutes TTL).",
        },
      },
      required: ["email", "code"],
    },
  },
  {
    name: "resend_verification",
    title: "Resend verification",
    description:
      "Email a new OTP (also used for reissue_key). No Bearer key required. Works when already verified.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        email: emailField("Account email to receive a new OTP."),
      },
      required: ["email"],
    },
  },
  {
    name: "reissue_key",
    title: "Reissue API key",
    description:
      "Mint a new account nv_ key from email OTP. No Bearer key required. WARNING: revokes prior account-scoped nv_ keys. Also verifies email if needed.",
    annotations: destroy,
    inputSchema: {
      type: "object",
      properties: {
        email: emailField("Account email that owns the key."),
        code: {
          type: "string",
          description: "OTP from resend_verification or the latest verification email.",
        },
      },
      required: ["email", "code"],
    },
  },
  {
    name: "checkout",
    title: "Stripe Checkout",
    description:
      "Return a Stripe Checkout URL for Pro ($29) or Scale. Requires nv_ + verified email. Use after a 2nd project or a 402 — never after the first live URL.",
    annotations: writeWorld,
    inputSchema: {
      type: "object",
      properties: {
        plan: {
          type: "string",
          enum: ["pro", "scale"],
          description: "Paid plan to subscribe. Defaults to pro.",
        },
        success_url: {
          type: "string",
          format: "uri",
          description: "Browser return URL after successful payment. Optional.",
        },
        cancel_url: {
          type: "string",
          format: "uri",
          description: "Browser return URL if the customer cancels Checkout. Optional.",
        },
      },
    },
  },
  {
    name: "mpp_upgrade",
    title: "MPP upgrade",
    description:
      "Start or complete Pro/Scale via Machine Payments Protocol. Requires nv_ + verified email. First call returns a 402 Payment challenge; retry with payment_authorization (Payment credential) or _meta org.paymentauth/credential. Use after a 2nd project or a 402 — never after the first live URL.",
    annotations: writeWorld,
    inputSchema: {
      type: "object",
      properties: {
        plan: {
          type: "string",
          enum: ["pro", "scale"],
          description: "Paid plan to start. Defaults to pro.",
        },
        payment_authorization: {
          type: "string",
          description:
            "Payment credential from settling the 402 challenge. Omit on the first call.",
        },
      },
    },
  },
  {
    name: "billing_portal",
    title: "Billing portal",
    description:
      "Stripe Customer Portal URL for an existing subscriber (manage/cancel). Not first-time subscribe — use checkout or mpp_upgrade for that.",
    annotations: writeWorld,
    inputSchema: {
      type: "object",
      properties: {
        return_url: {
          type: "string",
          format: "uri",
          description: "Browser URL after leaving the Stripe portal. Optional.",
        },
      },
    },
  },
  {
    name: "create_project",
    title: "Create project",
    description:
      "Create a new hosting project on the caller's account (counts against the caller's project quota). To edit a shared site, pass that project's project_id to upload/deploy tools instead.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Human-readable project name." },
        description: {
          type: "string",
          description: "Optional notes stored on the project. Not shown on the live site.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_projects",
    title: "List projects",
    description:
      "List hosting projects the caller owns or is invited to (ids, names, suffixes). Use get_project for one project's settings; use get_preview_url for the live URL. Read-only; does not create a project.",
    annotations: read,
    inputSchema: emptyObject,
  },
  {
    name: "get_project",
    title: "Get project",
    description:
      "Return one hosting project (name, suffix, settings, membership). Use list_projects to discover IDs. Use get_preview_url for the public URL only, and get_project_usage for quotas on that site. Read-only; does not mutate.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: { project_id: projectId() },
      required: ["project_id"],
    },
  },
  {
    name: "update_project_settings",
    title: "Update project settings",
    description:
      "Update project name, description, check thresholds, analyticsEnabled (cookieless edge traffic; off by default), or shareGateEmails (optional OTP gate on platform hosts only; empty = public).",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        name: { type: "string", description: "New display name. Omit to leave unchanged." },
        description: {
          type: "string",
          description: "New internal notes. Omit to leave unchanged.",
        },
        check_thresholds: {
          type: "object",
          additionalProperties: true,
          description:
            "Quality-check threshold overrides. Omit to leave unchanged.",
        },
        analytics_enabled: {
          type: "boolean",
          description:
            "Enable cookieless edge analytics. Required true before get_project_analytics returns totals.",
        },
        share_gate_emails: {
          type: "array",
          maxItems: 5,
          items: { type: "string" },
          description:
            "Up to 5 client emails. Non-empty turns on email OTP on *.novence.ai and /p/{suffix}/ only. Custom domains stay public. Empty array turns the gate off. Saving the list does not send mail.",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_upload_url",
    title: "Get upload URL",
    description:
      "Get a presigned PUT URL for one site file. content_type is optional (inferred from extension). Use get_upload_urls_batch for multi-file sites, then confirm_upload after the PUT.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        path: sitePath(),
        content_type: contentType(),
      },
      required: ["project_id", "path"],
    },
  },
  {
    name: "get_upload_urls_batch",
    title: "Get upload URLs (batch)",
    description:
      "Presign many site files at once (max 100). Prefer this over get_upload_url for multi-file sites. After PUTs, call confirm_uploads_batch, not confirm_upload.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        files: {
          type: "array",
          description: "Files to presign, max 100. Each needs a site-relative path.",
          items: {
            type: "object",
            properties: {
              path: sitePath(),
              content_type: contentType(),
            },
            required: ["path"],
          },
        },
      },
      required: ["project_id", "files"],
    },
  },
  {
    name: "confirm_upload",
    title: "Confirm upload",
    description:
      "Record one staged file after the client PUT to the presigned URL from get_upload_url. Use confirm_uploads_batch when several files were uploaded. Does not publish the site — call deploy after confirms. Re-confirming the same path updates metadata.",
    annotations: { ...write, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        path: sitePath(),
        content_type: contentType(),
      },
      required: ["project_id", "path"],
    },
  },
  {
    name: "confirm_uploads_batch",
    title: "Confirm uploads (batch)",
    description:
      "Confirm many uploads after get_upload_urls_batch PUTs. 200 body is { files, errors }. errors is always an array (empty on full success); retry only failed paths. Use confirm_upload for a single file. Does not deploy.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        files: {
          type: "array",
          description: "Same paths that were presigned and PUT.",
          items: {
            type: "object",
            properties: {
              path: sitePath(),
              content_type: contentType(),
            },
            required: ["path"],
          },
        },
      },
      required: ["project_id", "files"],
    },
  },
  {
    name: "list_files",
    title: "List files",
    description:
      "List staged site files for a project (paths, types, sizes). Use get_file for one path's metadata; use delete_file to remove a path. Read-only; does not deploy.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: { project_id: projectId() },
      required: ["project_id"],
    },
  },
  {
    name: "get_file",
    title: "Get file",
    description:
      "Return metadata for one staged path (not file bytes). Use list_files to discover paths; use get_upload_url to replace content. Read-only.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        path: sitePath(),
      },
      required: ["project_id", "path"],
    },
  },
  {
    name: "delete_file",
    title: "Delete file",
    description:
      "Remove one path from staging. Does not change the already-live deploy until the next deploy. Irreversible for that staged path; re-upload to restore. Use delete_form_submission for form PII, not this.",
    annotations: destroy,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        path: sitePath(),
      },
      required: ["project_id", "path"],
    },
  },
  {
    name: "set_redirects",
    title: "Set redirects",
    description:
      "Write /_redirects (Netlify subset) into staging. Call deploy afterwards to publish. SPA History routing: /*    /index.html   200. Exact files always win. Optional custom 404 is a separate /404.html upload. Does not write the live prefix.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        body: {
          type: "string",
          description: "Contents of /_redirects. Example: /*    /index.html   200",
        },
      },
      required: ["project_id", "body"],
    },
  },
  {
    name: "publish_html",
    title: "Publish HTML",
    description:
      "Publish one HTML document (report, dashboard, Claude-style artifact) as index.html and deploy. Omit project_id to create a project. Hosted MCP cannot read local files — pass the HTML string (read the file first). Returns url, project_id, and deployment. Poll get_deployment_status until live or failed. For multi-file sites use the upload + deploy loop instead. Re-call with the same project_id to replace the live page.",
    annotations: writeWorld,
    inputSchema: {
      type: "object",
      properties: {
        html: {
          type: "string",
          description:
            "Full HTML document to publish as /index.html. If you have a local file, read it and pass the contents here.",
        },
        title: {
          type: "string",
          description:
            "Project display name when creating a project. Optional; defaults to artifact.",
        },
        project_id: projectId("from create_project, list_projects, or a previous publish_html"),
        force: {
          type: "boolean",
          description:
            "If true, publish even when quality checks would block. Optional; default false.",
        },
      },
      required: ["html"],
    },
  },
  {
    name: "deploy",
    title: "Deploy site",
    description:
      "Publish the site. Verified accounts run quality checks; unverified accounts skip checks (checkRuns: 0) and still go live. POST returns quickly — poll get_deployment_status until live or failed. Do not retry POST while status is promoting or checking.",
    annotations: writeWorld,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        force: {
          type: "boolean",
          description:
            "If true, publish even when quality checks would block. Optional; default false.",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_deployment_status",
    title: "Get deployment status",
    description:
      "Poll publish state after deploy (queued, checking, promoting, live, failed). Omit deployment_id for the latest. Use get_checks_results for Lighthouse/a11y scores and get_preview_url once live. Read-only; do not retry deploy while promoting or checking.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        deployment_id: deploymentId(),
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_preview_url",
    title: "Get preview URL",
    description:
      "Return the public https://{suffix}.novence.ai URL for a project. Use get_deployment_status to know if that URL is live yet; use configure_custom_domain for a custom hostname. Read-only.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: { project_id: projectId() },
      required: ["project_id"],
    },
  },
  {
    name: "run_checks",
    title: "Run quality checks",
    description:
      "Start a Lighthouse, a11y, and link check cycle on the latest deployment. Does not publish a new deploy — use deploy for that. Then poll get_checks_results (not get_deployment_status) until scores appear. Unverified accounts skip checks on deploy; this still queues a cycle when allowed.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: { project_id: projectId() },
      required: ["project_id"],
    },
  },
  {
    name: "get_checks_results",
    title: "Get check results",
    description:
      "Read Lighthouse, a11y, and link results for a deployment. Omit deployment_id for the latest. Use run_checks to trigger a new cycle; use get_deployment_status for publish/promote state, not scores.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        deployment_id: deploymentId(),
      },
      required: ["project_id"],
    },
  },
  {
    name: "configure_custom_domain",
    title: "Configure custom domain",
    description:
      "Attach a custom domain. For site domains, enables apex+www. Default primary=www with redirect (Vercel-style). Pass primary=apex or redirect=false to change.",
    annotations: writeWorld,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        hostname: {
          type: "string",
          description: "Custom hostname (e.g. example.com or www.example.com).",
        },
        primary: {
          type: "string",
          enum: ["www", "apex"],
          description: "Which host is canonical. Default www.",
        },
        redirect: {
          type: "boolean",
          description:
            "If true, redirect the non-primary host to the primary. Default true.",
        },
      },
      required: ["project_id", "hostname"],
    },
  },
  {
    name: "get_domain_status",
    title: "Get domain status",
    description:
      "Read DNS and TLS status for the project's custom hostname after configure_custom_domain. Do not use this to attach a domain. Poll until verified; returns current hostname and certificate state. Read-only.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: { project_id: projectId() },
      required: ["project_id"],
    },
  },
  {
    name: "create_form",
    title: "Create form",
    description:
      "Create a Novence form on a project (optional — sites may use Formspree/Web3forms instead). Returns submit URLs for edge + public API.",
    annotations: writeWorld,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        name: { type: "string", description: "Display name for the form in the account." },
        slug: {
          type: "string",
          description: "URL slug. Optional; generated from name if omitted.",
        },
        fields: {
          type: "array",
          description: "Field definitions. Empty array allowed; add fields later with update_form.",
          items: formFieldItems,
        },
        notify_email: emailField("Where to email new submissions. Optional."),
        honeypot_field: {
          type: "string",
          description: "Hidden field name used as a spam honeypot. Optional.",
        },
      },
      required: ["project_id", "name"],
    },
  },
  {
    name: "list_forms",
    title: "List forms",
    description:
      "List Novence forms on a project (ids, slugs, status). Use update_form to change one; use list_form_submissions to read leads. Not for third-party widgets. Read-only.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: { project_id: projectId() },
      required: ["project_id"],
    },
  },
  {
    name: "update_form",
    title: "Update form",
    description:
      "Patch an existing Novence form (name, slug, fields, notify_email, honeypot, active|disabled). Partial update: omitted fields stay unchanged. Use create_form for a new form; use list_forms to get form_id. Does not delete submissions.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        form_id: {
          type: "string",
          format: "uuid",
          description: "Form UUID from create_form or list_forms.",
        },
        name: { type: "string", description: "New display name. Omit to leave unchanged." },
        slug: { type: "string", description: "New URL slug. Omit to leave unchanged." },
        fields: {
          type: "array",
          description:
            "Replacement field list when provided. Omit to leave the current schema unchanged.",
          items: formFieldItems,
        },
        notify_email: {
          type: "string",
          description:
            "Notification inbox. Pass null to clear. Omit to leave unchanged.",
        },
        honeypot_field: {
          type: "string",
          description: "Spam honeypot field name. Omit to leave unchanged.",
        },
        status: {
          type: "string",
          enum: ["active", "disabled"],
          description: "active accepts submissions; disabled rejects them. Omit to leave unchanged.",
        },
      },
      required: ["project_id", "form_id"],
    },
  },
  {
    name: "list_form_submissions",
    title: "List form submissions",
    description:
      "List visitor submissions for one Novence form (paginated). Use delete_form_submission to remove PII. Not for update_form schema changes. Read-only.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        form_id: {
          type: "string",
          format: "uuid",
          description: "Form UUID from list_forms.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Page size, 1–100. Optional.",
        },
        offset: {
          type: "integer",
          minimum: 0,
          description: "Number of submissions to skip. Optional; default 0.",
        },
      },
      required: ["project_id", "form_id"],
    },
  },
  {
    name: "delete_form_submission",
    title: "Delete form submission",
    description:
      "Permanently delete one form submission (PII). Does not disable the form — use update_form status=disabled. Irreversible.",
    annotations: destroy,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        form_id: {
          type: "string",
          format: "uuid",
          description: "Form UUID that owns the submission.",
        },
        submission_id: {
          type: "string",
          format: "uuid",
          description: "Submission UUID from list_form_submissions.",
        },
      },
      required: ["project_id", "form_id", "submission_id"],
    },
  },
  {
    name: "get_quotas_and_usage",
    title: "Get quotas and usage",
    description:
      "Account-level plan limits and current consumption (projects, storage, deploys, bandwidth). Use get_project_usage for one site; use get_account for profile plus quotas together. Read-only snapshot, not a live meter stream.",
    annotations: read,
    inputSchema: emptyObject,
  },
  {
    name: "get_project_usage",
    title: "Get project usage",
    description:
      "Per-project usage (storage, deploys, check minutes, bandwidth, forms). Bandwidth is live from edge-served bytes. Use get_quotas_and_usage for account totals; use get_project_analytics for pageviews. Read-only.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: { project_id: projectId() },
      required: ["project_id"],
    },
  },
  {
    name: "get_project_analytics",
    title: "Get project analytics",
    description:
      "Cookieless edge analytics for a hosted site: pageviews, 404s, top pages, referrers, and countries. Off by default. Enable with update_project_settings analytics_enabled=true. Default last 7 days (max 90). If disabled, returns enabled=false and empty totals.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        from: {
          type: "string",
          description: "Inclusive start date (ISO). Optional; default 7 days ago.",
        },
        to: {
          type: "string",
          description: "Inclusive end date (ISO). Optional; default today. Range max 90 days.",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_account",
    title: "Get account",
    description:
      "Full account snapshot: profile, subscription, quotas, usage, projects. Use get_quotas_and_usage for limits only; use get_account_console_kit to render a local HTML console. Read-only.",
    annotations: read,
    inputSchema: emptyObject,
  },
  {
    name: "create_account_session",
    title: "Create account session",
    description:
      "Mint a short-lived mgmt_ token for a local HTML console (account:read, billing:portal, project:members). Never put nv_ keys in HTML.",
    annotations: write,
    inputSchema: emptyObject,
  },
  {
    name: "get_account_console_kit",
    title: "Get account console kit",
    description:
      "JSON kit to write a local novence-console.html: snapshot, HTML template, session mint instructions. Serve on localhost. Use create_account_session for the mgmt_ token; use get_account for JSON without the kit. Read-only.",
    annotations: read,
    inputSchema: emptyObject,
  },
  {
    name: "invite_project_member",
    title: "Invite project member",
    description:
      "Invite a collaborator by email. Requires Pro/Scale on the project owner. Only the owner can invite as admin. Creates a new project on the caller's account if you use create_project instead — pass project_id here. Do not share the owner's nv_ key.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        email: emailField("Invitee's email. They accept with accept_project_invite."),
        role: {
          type: "string",
          enum: ["viewer", "editor", "admin"],
          description: "Access level. Default editor. Only the owner can grant admin.",
        },
      },
      required: ["project_id", "email"],
    },
  },
  {
    name: "list_project_members",
    title: "List project members",
    description:
      "List members and pending invites for a project. Use invite_project_member to add; use revoke_project_invite for pending tokens; use remove_project_member for accepted collaborators. Read-only.",
    annotations: read,
    inputSchema: {
      type: "object",
      properties: { project_id: projectId() },
      required: ["project_id"],
    },
  },
  {
    name: "update_project_member",
    title: "Update project member role",
    description:
      "Change a collaborator's role. Only the owner can grant or demote admin. Use remove_project_member to revoke access entirely. Does not affect pending invites — use revoke_project_invite for those.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        account_id: {
          type: "string",
          format: "uuid",
          description: "Collaborator account UUID from list_project_members.",
        },
        role: {
          type: "string",
          enum: ["viewer", "editor", "admin"],
          description: "New role. Only the owner can set admin.",
        },
      },
      required: ["project_id", "account_id", "role"],
    },
  },
  {
    name: "remove_project_member",
    title: "Remove project member",
    description:
      "Remove an accepted collaborator and revoke their project API keys. Owner-only for admins. For a pending invite, use revoke_project_invite instead. Irreversible; they must be invited again.",
    annotations: destroy,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        account_id: {
          type: "string",
          format: "uuid",
          description: "Collaborator account UUID from list_project_members.",
        },
      },
      required: ["project_id", "account_id"],
    },
  },
  {
    name: "revoke_project_invite",
    title: "Revoke project invite",
    description:
      "Cancel a pending invite so the token no longer works. Does not remove someone who already accepted — use remove_project_member for that. Irreversible for that invite_id; send a new invite_project_member if needed.",
    annotations: destroy,
    inputSchema: {
      type: "object",
      properties: {
        project_id: projectId(),
        invite_id: {
          type: "string",
          format: "uuid",
          description: "Pending invite UUID from list_project_members.",
        },
      },
      required: ["project_id", "invite_id"],
    },
  },
  {
    name: "leave_project",
    title: "Leave project",
    description:
      "Leave a project you were invited to. Owners cannot leave — transfer or stay. Revokes your project keys. Use remove_project_member if you are the owner removing someone else.",
    annotations: destroy,
    inputSchema: {
      type: "object",
      properties: { project_id: projectId() },
      required: ["project_id"],
    },
  },
  {
    name: "accept_project_invite",
    title: "Accept project invite",
    description:
      "Accept an invite token (from email or invite_project_member in local/dev). Unverified invitees must pass otp. Returns a project-scoped nv_ key once — never email it. Collaborating uses this project_id; create_project still bills the caller.",
    annotations: write,
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Invite token from the invitation email (or invite_project_member in local/dev).",
        },
        otp: {
          type: "string",
          description: "Email OTP required when the invitee is not yet verified. Optional if already verified.",
        },
      },
      required: ["token"],
    },
  },
];
