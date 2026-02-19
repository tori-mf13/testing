# Okta SAML Configuration Script

Interactive CLI wizard that configures standard SAML 2.0 applications in Okta.
Just run the script — it prompts for everything, starting with which Okta
tenant you are targeting.

## Quick Start

```bash
pip install -r requirements.txt
python okta_saml_config.py
```

That's it. The wizard handles the rest.

## How It Works

When you run the script with no arguments, it walks you through:

1. **Select Okta tenant** — pick from Production, Preview, or Development
   (defined in `config/okta_config.yaml`). The script shows the org URL and
   description for each so you always know where you're pointing.
2. **Authenticate** — reads the API token from a tenant-specific environment
   variable (e.g. `$OKTA_API_TOKEN_PROD`), or prompts you for it. Verifies
   the connection before continuing.
3. **Choose an action** — configure a new app, run from YAML, export metadata,
   switch tenant, or exit.
4. **Enter app details** — 7 guided steps with instructions, examples, and
   sensible defaults for every field.
5. **Review & confirm** — full summary table showing the target tenant before
   any API call is made.
6. **Production guard** — if the tenant has `require_confirmation: true`, you
   get an extra confirmation prompt before every write operation.

## How Does It Know Which Okta Tenant?

Tenants are defined in `config/okta_config.yaml`:

```yaml
tenants:
  - name: "Production"
    org_url: "https://your-company.okta.com"
    token_env_var: "OKTA_API_TOKEN_PROD"
    require_confirmation: true
    description: "Live production tenant — changes affect all employees"

  - name: "Preview"
    org_url: "https://your-company.oktapreview.com"
    token_env_var: "OKTA_API_TOKEN_PREVIEW"
    require_confirmation: false
    description: "Pre-production preview tenant — safe for testing"

  - name: "Development"
    org_url: "https://dev-123456.okta.com"
    token_env_var: "OKTA_API_TOKEN_DEV"
    require_confirmation: false
    description: "Developer sandbox — free to experiment"
```

Each tenant has its own:
- **org_url** — the Okta org base URL
- **token_env_var** — environment variable name holding the API token
  (tokens are never stored in config files)
- **require_confirmation** — when `true`, the script forces an extra yes/no
  before every write to prevent accidental production changes
- **description** — displayed in the tenant selection menu

Set your tokens before running:
```bash
export OKTA_API_TOKEN_PROD="00abc..."
export OKTA_API_TOKEN_PREVIEW="00xyz..."
export OKTA_API_TOKEN_DEV="00dev..."
```

## When To Use This Script

| Scenario | How |
|----------|-----|
| Onboarding a new SaaS app (e.g. vendor sends you SAML config) | Run the wizard, enter the ACS URL and Entity ID they gave you |
| Replicating an app from preview to production | Configure in Preview first, save to YAML, then batch-apply to Production |
| Bulk-provisioning multiple apps at once | Define them in `config/saml_apps.yaml`, run `--batch --tenant Preview` |
| Exporting IdP metadata to send to a vendor | `--export-metadata --tenant Production --app "Workato"` |
| Auditing what would be configured (without changing anything) | `--dry-run` in interactive mode or `--dry-run --batch --tenant Production` |

## Usage Modes

```bash
# Interactive wizard (default)
python okta_saml_config.py

# Interactive wizard, dry-run (no API calls)
python okta_saml_config.py --dry-run

# Non-interactive batch (requires --tenant)
python okta_saml_config.py --batch --tenant Production

# Batch a single app
python okta_saml_config.py --batch --tenant Preview --app "Workato"

# Export IdP metadata
python okta_saml_config.py --export-metadata --tenant Production --app "Workato"
```

### CLI Flags

| Flag                 | Description                                              |
|----------------------|----------------------------------------------------------|
| *(no flags)*         | Launch the interactive wizard                            |
| `--tenant <name>`    | Tenant name (Production, Preview, Development, etc.)     |
| `--batch`            | Non-interactive: configure apps from YAML (needs --tenant)|
| `--app <label>`      | Target a single app (with --batch or --export-metadata)  |
| `--dry-run`          | Validate without calling the Okta API                    |
| `--export-metadata`  | Print IdP metadata XML (needs --tenant and --app)        |

## Repository Structure

```
.
├── okta_saml_config.py          # Main script — interactive wizard + batch mode
├── requirements.txt             # Python dependencies (requests, pyyaml)
├── config/
│   ├── okta_config.yaml         # Tenant definitions, defaults, logging
│   └── saml_apps.yaml           # SAML application definitions
└── workato/
    ├── workato_saml_recipe.json # Importable Workato recipe definition
    └── WORKATO_PROCESS.md       # Workato process documentation
```

## Workato Integration

For fully automated provisioning triggered by service requests, see
[`workato/WORKATO_PROCESS.md`](workato/WORKATO_PROCESS.md). The Workato recipe:

1. Receives a webhook from a ticketing system (ServiceNow, Jira, Slack)
2. Creates or updates the SAML app in Okta
3. Assigns groups to the application
4. Retrieves IdP metadata and emails it to the requestor
5. Notifies the `#identity-ops` Slack channel

Import `workato/workato_saml_recipe.json` into your Workato workspace to get started.
