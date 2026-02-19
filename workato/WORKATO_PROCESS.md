# Workato Process: Okta SAML Application Provisioning

## Overview

This document describes the end-to-end Workato automation process for provisioning
SAML 2.0 applications in Okta. The recipe supports **multiple Okta tenants**
(production, preview, development), **manager approval for production changes**,
and **full SAML configuration** including optional fields like NameID format,
signing algorithms, and custom attribute statements.

---

## Process Flow

```
┌──────────────────┐
│  Trigger:        │
│  Webhook Request │
│  (ServiceNow /   │
│   Jira / Slack)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Validate required│
│ fields           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Resolve tenant   │──── unknown tenant ──► Stop with error
│ (prod/preview/   │
│  dev)            │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     production     ┌────────────────────┐
│ Production       ├───────────────────►│ Slack approval     │
│ tenant?          │                    │ in #identity-ops   │
└────────┬─────────┘                    └────────┬───────────┘
         │ no                                    │
         │                              denied ──┼──► Email requestor
         │                                       │    & stop
         │                             approved ─┘
         ▼◄──────────────────────────────────────┘
┌──────────────────┐     yes     ┌────────────────────┐
│ Search Okta for  ├────────────►│ Update existing    │
│ existing app     │             │ SAML configuration │
└────────┬─────────┘             └────────┬───────────┘
         │ no                             │
         ▼                                │
┌──────────────────┐                      │
│ Create new       │                      │
│ SAML 2.0 app     │                      │
└────────┬─────────┘                      │
         │                                │
         ▼◄───────────────────────────────┘
┌──────────────────┐
│ Activate the     │
│ application      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Loop: Assign     │
│ Okta groups      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Retrieve IdP     │
│ SAML metadata    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Email metadata   │
│ to requestor     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Notify #identity │
│ -ops on Slack    │
└──────────────────┘
```

---

## Step-by-Step

### 1. Trigger — Incoming Webhook

The webhook payload specifies **which tenant** to target and the full SAML
configuration. Required and optional fields:

| Field                  | Required | Description                                                |
|------------------------|----------|------------------------------------------------------------|
| `tenant`               | Yes      | `"production"`, `"preview"`, or `"development"`            |
| `app_label`            | Yes      | Display name for the app in Okta                           |
| `sso_acs_url`          | Yes      | Assertion Consumer Service URL                             |
| `audience_uri`         | Yes      | SP Entity ID / Audience URI                                |
| `requestor_email`      | Yes      | Email of the person requesting provisioning                |
| `groups`               | No       | Okta group names to assign (array)                         |
| `recipient_url`        | No       | Defaults to `sso_acs_url`                                  |
| `destination_url`      | No       | Defaults to `sso_acs_url`                                  |
| `default_relay_state`  | No       | RelayState URL after login                                 |
| `name_id_format`       | No       | NameID format (default: `emailAddress`)                    |
| `name_id_value`        | No       | Okta attribute for NameID (default: `user.email`)          |
| `response_signed`      | No       | Sign SAML response (default: `true`)                       |
| `assertion_signed`     | No       | Sign SAML assertion (default: `true`)                      |
| `signature_algorithm`  | No       | `RSA-SHA256` or `RSA-SHA1` (default: `RSA-SHA256`)         |
| `digest_algorithm`     | No       | `SHA256` or `SHA1` (default: `SHA256`)                     |
| `attribute_statements` | No       | Custom attribute statements (array of name/namespace/values)|

The webhook can be invoked by:
- A **ServiceNow** catalog item (via REST step)
- A **Jira** automation rule
- A **Slack** workflow or slash command
- Any system capable of sending an HTTP POST

### 2. Validate Required Fields

If `tenant`, `app_label`, `sso_acs_url`, `audience_uri`, or `requestor_email`
is missing, the recipe stops immediately with an error message.

### 3. Resolve Okta Tenant

A lookup table maps the `tenant` value to the correct Okta connection and
determines whether manager approval is required:

| Tenant value   | Okta Connection            | Org URL                                | Approval? |
|----------------|----------------------------|----------------------------------------|-----------|
| `production`   | `okta_connection_prod`     | `https://your-company.okta.com`        | Yes       |
| `preview`      | `okta_connection_preview`  | `https://your-company.oktapreview.com` | No        |
| `development`  | `okta_connection_dev`      | `https://dev-123456.okta.com`          | No        |

If the tenant value doesn't match any entry, the recipe stops with an error.

### 4. Production Approval Gate

If the tenant is **production**, the recipe posts an approval request to
`#identity-ops` on Slack:

> **Approval required** — SAML app provisioning to **Production**
>
> App: **Workato**
> ACS URL: `https://www.workato.com/saml/init`
> Requested by: admin@example.com
>
> React with :white_check_mark: to approve or :x: to deny.

- **Approved** — recipe continues to create/update the app.
- **Denied** — requestor receives an email explaining the denial, and the
  recipe stops.
- **Timeout** — no response within 24 hours, recipe fails.

Preview and Development tenants skip this step entirely.

### 5. Search for Existing Application

Workato queries `GET /api/v1/apps?q=<label>` on the resolved tenant to check
whether an app with the same label already exists.

- **If found** → update the existing app.
- **If not found** → create a new SAML 2.0 app.

### 6. Create or Update the SAML Application

The recipe builds the Okta API payload using values from the webhook. All
optional fields fall back to sensible defaults when not provided:

| Setting                | Source                                         | Default                    |
|------------------------|------------------------------------------------|----------------------------|
| Sign-on mode           | Always                                         | `SAML_2_0`                 |
| SSO ACS URL            | `trigger.sso_acs_url`                          | (required)                 |
| Audience / Entity ID   | `trigger.audience_uri`                         | (required)                 |
| Recipient URL          | `trigger.recipient_url`                        | Same as ACS URL            |
| Destination URL        | `trigger.destination_url`                      | Same as ACS URL            |
| Default RelayState     | `trigger.default_relay_state`                  | Empty                      |
| NameID format          | `trigger.name_id_format`                       | `emailAddress`             |
| NameID template        | `trigger.name_id_value`                        | `${user.email}`            |
| Response signed        | `trigger.response_signed`                      | `true`                     |
| Assertion signed       | `trigger.assertion_signed`                     | `true`                     |
| Signature algorithm    | `trigger.signature_algorithm`                  | `RSA-SHA256`               |
| Digest algorithm       | `trigger.digest_algorithm`                     | `SHA256`                   |
| Attribute statements   | `trigger.attribute_statements`                 | email, firstName, lastName |

### 7. Activate the Application

After creation or update, the app is activated via
`POST /api/v1/apps/{id}/lifecycle/activate`.

### 8. Assign Groups

For each group name in the webhook payload, the recipe:

1. Searches Okta for the group (`GET /api/v1/groups?q=<name>`)
2. If found, assigns the group to the application
3. If not found, logs a warning and continues

### 9. Retrieve IdP Metadata

The recipe fetches the IdP SAML metadata XML from
`GET /api/v1/apps/{id}/sso/saml/metadata`.

### 10. Email Metadata to Requestor

An email is sent to `requestor_email` with:
- The tenant name and org URL
- The Okta application ID
- The SSO ACS URL
- The IdP metadata XML as an attachment (named `idp_metadata_<app_label>.xml`)

The email subject includes the tenant name (e.g.
`[Production] SAML SSO configured for Workato`) so the requestor knows which
environment was configured.

### 11. Notify Slack

A message is posted to `#identity-ops` confirming the provisioning, including
the tenant name, org URL, app ID, and assigned groups.

---

## Error Handling

If any step fails, the recipe's error handler posts to `#identity-ops`:

> :x: Workato recipe failed to configure SAML app **Workato** in **Production**.
> Error: 401 Unauthorized
> Requested by: admin@example.com

The recipe run is marked as failed in Workato's job history.

---

## Workato Connections Required

| Connection                | Provider | Tenant        | Notes                                            |
|---------------------------|----------|---------------|--------------------------------------------------|
| `okta_connection_prod`    | Okta     | Production    | API token with Application Administrator privs   |
| `okta_connection_preview` | Okta     | Preview       | API token with Application Administrator privs   |
| `okta_connection_dev`     | Okta     | Development   | API token with Application Administrator privs   |
| `smtp_connection`         | SMTP     | —             | Email provider for sending metadata               |
| `slack_connection`        | Slack    | —             | Bot with posting + reactions in `#identity-ops`   |

---

## Setup Instructions

### In Workato

1. **Import the recipe** — Upload `workato_saml_recipe.json` via
   Workato UI > Recipes > Import.
2. **Configure connections** — Under App Connections, create:
   - **okta_connection_prod** — your production Okta org URL and API token.
   - **okta_connection_preview** — your preview/staging Okta org URL and token.
   - **okta_connection_dev** — your dev sandbox Okta org URL and token.
   - **smtp_connection** — your email provider.
   - **slack_connection** — authenticate with your Slack workspace.
3. **Update the lookup table** — In step 2 of the recipe, update the `org_url`
   values in the tenant lookup table to match your actual Okta org URLs.
4. **Copy the webhook URL** — after importing, Workato generates a unique
   webhook URL. Copy it for use in your ticketing system.
5. **Test** — send a test payload to the webhook targeting the development
   tenant first:

   ```bash
   curl -X POST https://app.workato.com/webhooks/rest/<YOUR_WEBHOOK_ID> \
     -H "Content-Type: application/json" \
     -d '{
       "tenant": "development",
       "app_label": "Test App",
       "sso_acs_url": "https://test.example.com/saml/acs",
       "audience_uri": "https://test.example.com/saml/metadata",
       "requestor_email": "admin@example.com",
       "groups": ["Test-Users"]
     }'
   ```

   Then test with production to verify the approval flow:

   ```bash
   curl -X POST https://app.workato.com/webhooks/rest/<YOUR_WEBHOOK_ID> \
     -H "Content-Type: application/json" \
     -d '{
       "tenant": "production",
       "app_label": "Test App",
       "sso_acs_url": "https://test.example.com/saml/acs",
       "audience_uri": "https://test.example.com/saml/metadata",
       "requestor_email": "admin@example.com",
       "groups": ["Test-Users"],
       "name_id_format": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
       "signature_algorithm": "RSA-SHA256",
       "attribute_statements": [
         {"name": "email", "values": ["user.email"]},
         {"name": "firstName", "values": ["user.firstName"]}
       ]
     }'
   ```

6. **Start the recipe** — once testing passes, toggle the recipe to active.

### In Your Ticketing System

Configure your ServiceNow catalog item, Jira automation, or Slack workflow to
POST to the Workato webhook URL. The `tenant` field should be set based on the
request type or environment dropdown in your form.

---

## Using the Standalone Script Instead

For ad-hoc or bulk provisioning outside of Workato, use the interactive CLI
script directly:

```bash
# Interactive wizard — prompts for tenant, app details, and confirmation
python okta_saml_config.py

# Non-interactive batch mode (requires --tenant)
python okta_saml_config.py --batch --tenant Production

# Batch a single app
python okta_saml_config.py --batch --tenant Preview --app "Workato"

# Dry-run (validate config, no API calls)
python okta_saml_config.py --dry-run

# Export IdP metadata
python okta_saml_config.py --export-metadata --tenant Production --app "Workato"
```

Tenants are defined in `config/okta_config.yaml`. API tokens are read from
per-tenant environment variables (`$OKTA_API_TOKEN_PROD`,
`$OKTA_API_TOKEN_PREVIEW`, `$OKTA_API_TOKEN_DEV`).

See `config/saml_apps.yaml` to add or modify application definitions.
