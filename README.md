# Okta SAML Configuration Script

Automates the provisioning of standard SAML 2.0 applications in Okta, with an
optional Workato recipe for end-to-end workflow automation.

## Repository Structure

```
.
├── okta_saml_config.py          # Main script – creates/updates SAML apps in Okta
├── requirements.txt             # Python dependencies
├── config/
│   ├── okta_config.yaml         # Okta connection settings and defaults
│   └── saml_apps.yaml           # SAML application definitions
└── workato/
    ├── workato_saml_recipe.json # Importable Workato recipe definition
    └── WORKATO_PROCESS.md       # Workato process documentation
```

## Quick Start

### Prerequisites

- Python 3.9+
- An Okta org with an API token (Security > API > Tokens)
- The token must have **Application Administrator** privileges

### Installation

```bash
pip install -r requirements.txt
```

### Configuration

1. Set your Okta credentials as environment variables:

   ```bash
   export OKTA_ORG_URL="https://your-org.okta.com"
   export OKTA_API_TOKEN="your-api-token"
   ```

2. Define your SAML applications in `config/saml_apps.yaml`. Three example apps
   (Workato, Datadog, Slack) are included as templates.

### Usage

```bash
# Configure all applications
python okta_saml_config.py

# Configure a single application
python okta_saml_config.py --app "Workato"

# Dry-run – validate without making API calls
python okta_saml_config.py --dry-run

# Export IdP metadata XML for an application
python okta_saml_config.py --export-metadata --app "Workato"
```

### CLI Options

| Flag                 | Description                                      |
|----------------------|--------------------------------------------------|
| `--app <label>`      | Configure only the named application              |
| `--dry-run`          | Validate config; do not call the Okta API         |
| `--export-metadata`  | Print IdP SAML metadata XML (requires `--app`)    |
| `--config <path>`    | Custom path to `okta_config.yaml`                 |
| `--apps-file <path>` | Custom path to `saml_apps.yaml`                   |

## Workato Integration

For fully automated provisioning triggered by service requests, see
[`workato/WORKATO_PROCESS.md`](workato/WORKATO_PROCESS.md). The Workato recipe:

1. Receives a webhook from a ticketing system (ServiceNow, Jira, Slack)
2. Creates or updates the SAML app in Okta
3. Assigns groups to the application
4. Retrieves IdP metadata and emails it to the requestor
5. Notifies the `#identity-ops` Slack channel

Import `workato/workato_saml_recipe.json` into your Workato workspace to get started.
