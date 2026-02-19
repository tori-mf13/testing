# Workato Process: Okta SAML Application Provisioning

## Overview

This document describes the end-to-end Workato automation process for provisioning
SAML 2.0 applications in Okta. The recipe automates what would otherwise be a
manual, error-prone workflow performed by identity engineers.

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

### 1. Trigger – Incoming Webhook

| Field              | Description                                          |
|--------------------|------------------------------------------------------|
| `app_label`        | Display name for the app in Okta                     |
| `sso_acs_url`      | Assertion Consumer Service URL of the service provider|
| `audience_uri`     | SP Entity ID / Audience URI                          |
| `requestor_email`  | Email of the person requesting provisioning          |
| `groups`           | Okta group names to assign to the app                |

The webhook can be invoked by:
- A **ServiceNow** catalog item (via REST step)
- A **Jira** automation rule
- A **Slack** workflow or slash command
- Any system capable of sending an HTTP POST

### 2. Search for Existing Application

Workato queries the Okta Applications API (`GET /api/v1/apps?q=<label>`) to
determine whether an application with the same label already exists.

- **If found** → proceed to update the existing app configuration.
- **If not found** → proceed to create a new SAML 2.0 app.

### 3. Create or Update the SAML Application

The recipe builds the Okta application payload with these settings:

| Setting                | Value                                                    |
|------------------------|----------------------------------------------------------|
| Sign-on mode           | `SAML_2_0`                                               |
| SSO ACS URL            | From webhook payload                                     |
| Audience / Entity ID   | From webhook payload                                     |
| NameID format          | `emailAddress`                                           |
| NameID template        | `${user.email}`                                          |
| Response signed        | `true`                                                   |
| Assertion signed       | `true`                                                   |
| Signature algorithm    | `RSA-SHA256`                                             |
| Digest algorithm       | `SHA256`                                                 |
| Attribute statements   | `email`, `firstName`, `lastName`                         |

### 4. Activate the Application

After creation, the app is activated via `POST /api/v1/apps/{id}/lifecycle/activate`.

### 5. Assign Groups

For each group name in the webhook payload, the recipe:

1. Searches Okta for the group (`GET /api/v1/groups?q=<name>`)
2. If found, assigns the group to the application
3. If not found, logs a warning and continues

### 6. Retrieve IdP Metadata

The recipe fetches the IdP SAML metadata XML from
`GET /api/v1/apps/{id}/sso/saml/metadata`. This metadata is needed by the
service provider to complete SSO configuration.

### 7. Email Metadata to Requestor

An email is sent to `requestor_email` containing:
- Confirmation that the app is configured
- The Okta application ID
- The SSO ACS URL
- The IdP metadata XML as an attachment

### 8. Notify Slack

A message is posted to the `#identity-ops` Slack channel confirming the
provisioning, or reporting an error if any step failed.

---

## Error Handling

If any step fails, the recipe's error handler:
1. Posts an error notification to `#identity-ops` on Slack with the error details
2. The recipe run is marked as failed in Workato's job history

---

## Workato Connections Required

| Connection        | Provider | Notes                                              |
|-------------------|----------|----------------------------------------------------|
| `okta_connection` | Okta     | API token with Application Administrator privileges |
| `smtp_connection` | SMTP     | Email provider for sending metadata                 |
| `slack_connection`| Slack    | Bot with permission to post to `#identity-ops`      |

---

## Setup Instructions

### In Workato

1. **Import the recipe** – Upload `workato_saml_recipe.json` via
   Workato UI → Recipes → Import.
2. **Configure connections** – Under App Connections, set up:
   - **Okta**: Enter your Okta org URL and API token.
   - **SMTP / Email**: Configure your email provider credentials.
   - **Slack**: Authenticate with your Slack workspace.
3. **Copy the webhook URL** – After importing, Workato generates a unique
   webhook URL. Copy it for use in your ticketing system.
4. **Test** – Send a test payload to the webhook:

   ```bash
   curl -X POST https://app.workato.com/webhooks/rest/<YOUR_WEBHOOK_ID> \
     -H "Content-Type: application/json" \
     -d '{
       "app_label": "Test App",
       "sso_acs_url": "https://test.example.com/saml/acs",
       "audience_uri": "https://test.example.com/saml/metadata",
       "requestor_email": "admin@example.com",
       "groups": ["Test-Users"]
     }'
   ```

5. **Start the recipe** – Once testing passes, toggle the recipe to active.

### In Your Ticketing System

Configure your ServiceNow catalog item, Jira automation, or Slack workflow to
POST to the Workato webhook URL with the expected payload fields.

---

## Using the Standalone Script Instead

For ad-hoc or bulk provisioning outside of Workato, use the Python script
directly:

```bash
# Set credentials
export OKTA_ORG_URL="https://your-org.okta.com"
export OKTA_API_TOKEN="your-api-token"

# Configure all apps defined in config/saml_apps.yaml
python okta_saml_config.py

# Configure a specific app
python okta_saml_config.py --app "Workato"

# Dry-run (validate only)
python okta_saml_config.py --dry-run

# Export metadata for an app
python okta_saml_config.py --export-metadata --app "Workato"
```

See `config/saml_apps.yaml` to add or modify application definitions.
