# Okta SAML Configuration Script

Interactive wizard that configures standard SAML 2.0 applications in Okta.
Just run the script — it prompts for everything with clear instructions at
each step.

## Repository Structure

```
.
├── okta_saml_config.py          # Main script — interactive wizard + batch mode
├── requirements.txt             # Python dependencies
├── config/
│   ├── okta_config.yaml         # Okta connection settings and defaults
│   └── saml_apps.yaml           # SAML application definitions (auto-saved)
└── workato/
    ├── workato_saml_recipe.json # Importable Workato recipe definition
    └── WORKATO_PROCESS.md       # Workato process documentation
```

## Quick Start

```bash
pip install -r requirements.txt
python okta_saml_config.py
```

That's it. The wizard walks you through:

1. **Okta credentials** — org URL and API token (or reads `OKTA_ORG_URL` / `OKTA_API_TOKEN` env vars)
2. **Choose an action** — new app, batch from YAML, export metadata, or exit
3. **Application identity** — name, ACS URL, audience URI (with examples and explanations)
4. **Optional URLs** — recipient, destination, relay state (defaults pre-filled)
5. **NameID configuration** — format and value picked from a numbered menu
6. **Signing & security** — algorithm and signing options as yes/no prompts
7. **Attribute statements** — add as many as needed, one at a time
8. **Group assignment** — comma-separated list of Okta groups
9. **Review & confirm** — full summary table before any API call is made
10. **Save to YAML** — optionally saves the definition for future batch runs

Every field shows an instruction explaining what to enter, where to find the
value, and an example. Sensible defaults are pre-filled in `[brackets]` —
just press Enter to accept them.

## Usage Modes

```bash
# Interactive wizard (default — just run it)
python okta_saml_config.py

# Interactive wizard in dry-run mode (no API calls)
python okta_saml_config.py --dry-run

# Non-interactive batch mode from YAML
python okta_saml_config.py --batch

# Batch mode for a single app
python okta_saml_config.py --batch --app "Workato"

# Export IdP metadata
python okta_saml_config.py --export-metadata --app "Workato"
```

### CLI Flags

| Flag                 | Description                                         |
|----------------------|-----------------------------------------------------|
| *(no flags)*         | Launch the interactive wizard                       |
| `--batch`            | Non-interactive: configure apps from YAML           |
| `--app <label>`      | Target a single app (with `--batch` or `--export-metadata`) |
| `--dry-run`          | Validate without calling the Okta API               |
| `--export-metadata`  | Print IdP metadata XML (requires `--app`)           |
| `--config <path>`    | Custom path to `okta_config.yaml`                   |
| `--apps-file <path>` | Custom path to `saml_apps.yaml`                     |

## Workato Integration

For fully automated provisioning triggered by service requests, see
[`workato/WORKATO_PROCESS.md`](workato/WORKATO_PROCESS.md). The Workato recipe:

1. Receives a webhook from a ticketing system (ServiceNow, Jira, Slack)
2. Creates or updates the SAML app in Okta
3. Assigns groups to the application
4. Retrieves IdP metadata and emails it to the requestor
5. Notifies the `#identity-ops` Slack channel

Import `workato/workato_saml_recipe.json` into your Workato workspace to get started.
