#!/usr/bin/env python3
"""Configure standard SAML 2.0 applications in Okta.

Interactive wizard that walks you through every step of SAML app provisioning.
Just run the script — it will prompt for everything it needs.

Usage:
    # Launch interactive wizard (default)
    python okta_saml_config.py

    # Non-interactive batch mode using YAML definitions
    python okta_saml_config.py --batch

    # Batch mode for a single app
    python okta_saml_config.py --batch --app "Workato"

    # Dry-run (validate only, no API calls)
    python okta_saml_config.py --dry-run

    # Export IdP metadata for a configured application
    python okta_saml_config.py --export-metadata --app "Workato"
"""

from __future__ import annotations

import argparse
import getpass
import json
import logging
import os
import sys
import textwrap
import time
from pathlib import Path
from typing import Any

import requests
import yaml

# ─── Constants ───────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_DIR = SCRIPT_DIR / "config"
OKTA_CONFIG_PATH = CONFIG_DIR / "okta_config.yaml"
SAML_APPS_PATH = CONFIG_DIR / "saml_apps.yaml"

RATE_LIMIT_PAUSE = 1.0

logger = logging.getLogger("okta_saml_config")

# ANSI colors for terminal output
BOLD = "\033[1m"
DIM = "\033[2m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
RESET = "\033[0m"

NAMEID_FORMATS = {
    "1": ("Email Address", "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"),
    "2": ("Unspecified", "urn:oasis:names:tc:SAML:2.0:nameid-format:unspecified"),
    "3": ("Persistent", "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent"),
    "4": ("Transient", "urn:oasis:names:tc:SAML:2.0:nameid-format:transient"),
    "5": ("X509 Subject Name", "urn:oasis:names:tc:SAML:1.1:nameid-format:x509SubjectName"),
}

NAMEID_VALUES = {
    "1": ("user.email", "user.email"),
    "2": ("user.login", "user.login"),
    "3": ("user.firstName + user.lastName", "user.firstName + user.lastName"),
}

SIGNATURE_ALGORITHMS = {
    "1": "RSA-SHA256",
    "2": "RSA-SHA1",
}

DIGEST_ALGORITHMS = {
    "1": "SHA256",
    "2": "SHA1",
}


# ─── Helpers ─────────────────────────────────────────────────────────────────


def load_yaml(path: Path) -> dict:
    with open(path, "r") as fh:
        return yaml.safe_load(fh) or {}


def setup_logging(log_cfg: dict) -> None:
    level = getattr(logging, log_cfg.get("level", "INFO").upper(), logging.INFO)
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    log_file = log_cfg.get("file")
    if log_file:
        handlers.append(logging.FileHandler(log_file))
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=handlers,
    )


# ─── Interactive Prompt Helpers ──────────────────────────────────────────────


def _banner(title: str) -> None:
    """Print a section banner."""
    width = 60
    print(f"\n{BOLD}{CYAN}{'─' * width}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'─' * width}{RESET}\n")


def _step(number: int, total: int, title: str) -> None:
    """Print a step header."""
    print(f"\n{BOLD}[Step {number}/{total}] {title}{RESET}")


def _instruction(text: str) -> None:
    """Print a help instruction below a prompt."""
    for line in textwrap.wrap(text, width=70):
        print(f"  {DIM}{line}{RESET}")


def _prompt(label: str, default: str = "", required: bool = True, secret: bool = False) -> str:
    """Prompt the user for a value with optional default."""
    suffix = f" [{default}]" if default else ""
    prompt_text = f"  {BOLD}{label}{RESET}{suffix}: "
    while True:
        if secret:
            value = getpass.getpass(prompt_text)
        else:
            value = input(prompt_text)
        value = value.strip()
        if not value and default:
            return default
        if not value and required:
            print(f"  {RED}This field is required. Please enter a value.{RESET}")
            continue
        return value


def _prompt_choice(label: str, options: dict[str, tuple[str, ...] | str], default: str = "1") -> str:
    """Prompt the user to pick from a numbered list. Returns the value (not key)."""
    print(f"  {BOLD}{label}{RESET}")
    for key, val in options.items():
        display = val[0] if isinstance(val, tuple) else val
        marker = f" {DIM}(default){RESET}" if key == default else ""
        print(f"    {key}) {display}{marker}")
    choice = _prompt("Choice", default=default)
    while choice not in options:
        print(f"  {RED}Invalid choice. Pick one of: {', '.join(options.keys())}{RESET}")
        choice = _prompt("Choice", default=default)
    selected = options[choice]
    return selected[1] if isinstance(selected, tuple) else selected


def _prompt_yes_no(label: str, default: bool = True) -> bool:
    """Prompt for a yes/no answer."""
    hint = "Y/n" if default else "y/N"
    value = _prompt(f"{label} ({hint})", default="y" if default else "n", required=False)
    return value.lower() in ("y", "yes", "true", "1", "")


def _prompt_list(label: str, instruction: str) -> list[str]:
    """Prompt for a comma-separated list of values."""
    _instruction(instruction)
    raw = _prompt(label, default="", required=False)
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


# ─── Okta API Client ────────────────────────────────────────────────────────


class OktaClient:
    """Minimal Okta REST API wrapper for SAML app management."""

    def __init__(self, org_url: str, api_token: str) -> None:
        self.base_url = org_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"SSWS {api_token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
        )

    def _request(self, method: str, path: str, **kwargs: Any) -> requests.Response:
        url = f"{self.base_url}/api/v1{path}"
        resp = self.session.request(method, url, **kwargs)
        if resp.status_code == 429:
            reset = int(resp.headers.get("X-Rate-Limit-Reset", time.time() + 30))
            wait = max(reset - int(time.time()), 1)
            logger.warning("Rate-limited — waiting %d seconds", wait)
            time.sleep(wait)
            return self._request(method, path, **kwargs)
        resp.raise_for_status()
        return resp

    def get(self, path: str, **kwargs: Any) -> Any:
        return self._request("GET", path, **kwargs).json()

    def post(self, path: str, payload: dict, **kwargs: Any) -> Any:
        return self._request("POST", path, json=payload, **kwargs).json()

    def put(self, path: str, payload: dict, **kwargs: Any) -> Any:
        return self._request("PUT", path, json=payload, **kwargs).json()

    def find_app_by_label(self, label: str) -> dict | None:
        apps = self.get("/apps", params={"q": label, "limit": 50})
        for app in apps:
            if app.get("label") == label:
                return app
        return None

    def create_saml_app(self, payload: dict) -> dict:
        logger.info("Creating SAML app: %s", payload.get("label"))
        app = self.post("/apps", payload)
        logger.info("Created app id=%s", app["id"])
        return app

    def update_saml_app(self, app_id: str, payload: dict) -> dict:
        logger.info("Updating SAML app id=%s", app_id)
        return self.put(f"/apps/{app_id}", payload)

    def activate_app(self, app_id: str) -> None:
        self._request("POST", f"/apps/{app_id}/lifecycle/activate")
        logger.info("Activated app id=%s", app_id)

    def get_app_metadata(self, app_id: str) -> str:
        resp = self._request("GET", f"/apps/{app_id}/sso/saml/metadata")
        return resp.text

    def find_group_by_name(self, name: str) -> dict | None:
        groups = self.get("/groups", params={"q": name, "limit": 50})
        for g in groups:
            if g.get("profile", {}).get("name") == name:
                return g
        return None

    def assign_group_to_app(self, app_id: str, group_id: str) -> None:
        self._request("PUT", f"/apps/{app_id}/groups/{group_id}", json={})
        logger.info("Assigned group %s to app %s", group_id, app_id)


# ─── Payload Builder ────────────────────────────────────────────────────────


def build_saml_payload(app_def: dict, defaults: dict) -> dict:
    def _val(key: str, fallback: Any = None) -> Any:
        return app_def.get(key, defaults.get(key, fallback))

    attribute_statements = []
    for attr in app_def.get("attribute_statements", []):
        attribute_statements.append(
            {
                "type": "EXPRESSION",
                "name": attr["name"],
                "namespace": attr.get(
                    "namespace",
                    "urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified",
                ),
                "values": attr.get("values", []),
            }
        )

    sso_acs_url = app_def["sso_acs_url"]

    return {
        "label": app_def["label"],
        "visibility": {
            "autoSubmitToolbar": False,
            "hide": {"iOS": False, "web": False},
        },
        "signOnMode": "SAML_2_0",
        "settings": {
            "signOn": {
                "defaultRelayState": _val("default_relay_state", ""),
                "ssoAcsUrl": sso_acs_url,
                "recipient": _val("recipient_url", sso_acs_url),
                "destination": _val("destination_url", sso_acs_url),
                "audience": app_def["audience_uri"],
                "subjectNameIdFormat": _val(
                    "name_id_format",
                    "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
                ),
                "subjectNameIdTemplate": "${" + _val("name_id_value", "user.email") + "}",
                "responseSigned": _val("response_signed", True),
                "assertionSigned": _val("assertion_signed", True),
                "signatureAlgorithm": _val("signature_algorithm", "RSA-SHA256"),
                "digestAlgorithm": _val("digest_algorithm", "SHA256"),
                "honorForceAuthn": _val("honor_force_authn", True),
                "authnContextClassRef": _val(
                    "authn_context_class",
                    "urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport",
                ),
                "attributeStatements": attribute_statements,
            }
        },
    }


# ─── Core Logic ──────────────────────────────────────────────────────────────


def configure_app(
    client: OktaClient,
    app_def: dict,
    defaults: dict,
    dry_run: bool = False,
) -> dict | None:
    label = app_def["label"]
    payload = build_saml_payload(app_def, defaults)

    if dry_run:
        logger.info("[DRY-RUN] Would configure app: %s", label)
        logger.debug("[DRY-RUN] Payload:\n%s", json.dumps(payload, indent=2))
        return None

    existing = client.find_app_by_label(label)
    if existing:
        app = client.update_saml_app(existing["id"], payload)
    else:
        app = client.create_saml_app(payload)

    if app.get("status") != "ACTIVE":
        client.activate_app(app["id"])

    for group_name in app_def.get("groups_assigned", []):
        group = client.find_group_by_name(group_name)
        if group:
            client.assign_group_to_app(app["id"], group["id"])
        else:
            logger.warning("Group '%s' not found — skipping assignment", group_name)

    time.sleep(RATE_LIMIT_PAUSE)
    return app


def export_metadata(client: OktaClient, label: str) -> None:
    app = client.find_app_by_label(label)
    if not app:
        logger.error("Application '%s' not found in Okta", label)
        sys.exit(1)
    print(client.get_app_metadata(app["id"]))


# ─── Interactive Wizard ──────────────────────────────────────────────────────


def prompt_credentials() -> tuple[str, str]:
    """Prompt for Okta org URL and API token, using env vars as defaults."""
    _banner("Okta Connection")

    env_url = os.environ.get("OKTA_ORG_URL", "")
    env_token = os.environ.get("OKTA_API_TOKEN", "")

    _instruction(
        "Enter your Okta org URL. This is the base URL you use to sign in "
        "to the Okta Admin Console (e.g. https://your-org.okta.com). "
        "Do NOT include a trailing slash."
    )
    org_url = _prompt("Okta Org URL", default=env_url)

    print()
    _instruction(
        "Enter an Okta API token. To create one: sign in to the Admin "
        "Console > Security > API > Tokens > Create Token. "
        "The token must have Application Administrator privileges. "
        "Your input will be hidden."
    )
    api_token = _prompt("API Token", default=env_token if env_token else "", secret=True)

    return org_url, api_token


def prompt_app_details() -> dict:
    """Walk the user through entering all SAML application fields."""
    total_steps = 7

    # ── Step 1: Basic Info ───────────────────────────────────────────────
    _step(1, total_steps, "Application Identity")

    _instruction(
        "Enter the display name for this application as it will appear "
        "in the Okta dashboard (e.g. \"Workato\", \"Datadog\", \"Slack\")."
    )
    label = _prompt("Application Name")

    print()
    _instruction(
        "Enter the Single Sign-On ACS URL (Assertion Consumer Service URL). "
        "This is the URL where Okta will POST SAML responses. You can find "
        "this in your service provider's SSO/SAML configuration page. "
        "Example: https://www.workato.com/saml/init"
    )
    sso_acs_url = _prompt("SSO ACS URL")

    print()
    _instruction(
        "Enter the Audience URI (SP Entity ID). This is a unique identifier "
        "for the service provider, usually a URL. You can find this in your "
        "SP's SAML configuration page. "
        "Example: https://www.workato.com/saml/metadata"
    )
    audience_uri = _prompt("Audience URI (SP Entity ID)")

    # ── Step 2: Optional URLs ────────────────────────────────────────────
    _step(2, total_steps, "Optional URLs")
    _instruction(
        "These URLs usually match the SSO ACS URL. Press Enter to accept "
        "the defaults unless your SP documentation says otherwise."
    )

    print()
    _instruction("Recipient URL — where the SAML assertion is delivered.")
    recipient_url = _prompt("Recipient URL", default=sso_acs_url, required=False)

    print()
    _instruction("Destination URL — where the SAML response is sent.")
    destination_url = _prompt("Destination URL", default=sso_acs_url, required=False)

    print()
    _instruction(
        "Default RelayState — a URL the user is redirected to after login. "
        "Leave blank if your SP does not require one."
    )
    default_relay_state = _prompt("Default RelayState", default="", required=False)

    # ── Step 3: NameID Configuration ─────────────────────────────────────
    _step(3, total_steps, "NameID Configuration")
    _instruction(
        "NameID is the primary identifier Okta sends to the SP for each user. "
        "Most applications expect the user's email address."
    )

    print()
    name_id_format = _prompt_choice("NameID Format:", NAMEID_FORMATS, default="1")

    print()
    _instruction(
        "Choose which Okta user attribute to use as the NameID value."
    )
    name_id_value = _prompt_choice("NameID Value:", NAMEID_VALUES, default="1")

    # ── Step 4: Signing Configuration ────────────────────────────────────
    _step(4, total_steps, "Signing & Security")
    _instruction(
        "These settings control how Okta signs the SAML response and "
        "assertion. The defaults (RSA-SHA256, both signed) are recommended "
        "unless your SP requires otherwise."
    )

    print()
    response_signed = _prompt_yes_no("Sign the SAML Response?", default=True)
    assertion_signed = _prompt_yes_no("Sign the SAML Assertion?", default=True)

    print()
    signature_algorithm = _prompt_choice(
        "Signature Algorithm:", SIGNATURE_ALGORITHMS, default="1"
    )
    digest_algorithm = _prompt_choice(
        "Digest Algorithm:", DIGEST_ALGORITHMS, default="1"
    )

    print()
    honor_force_authn = _prompt_yes_no(
        "Honor ForceAuthn requests from the SP?", default=True
    )

    # ── Step 5: Attribute Statements ─────────────────────────────────────
    _step(5, total_steps, "Attribute Statements")
    _instruction(
        "Attribute statements send additional user data to the SP inside "
        "the SAML assertion (e.g. email, first name, last name). "
        "You can add as many as needed, or skip this step."
    )

    attribute_statements: list[dict] = []
    add_attrs = _prompt_yes_no("Add attribute statements?", default=True)
    while add_attrs:
        print()
        _instruction(
            "Enter the attribute name exactly as the SP expects it "
            "(e.g. \"email\", \"User.Email\", \"firstName\")."
        )
        attr_name = _prompt("Attribute Name")

        _instruction(
            "Enter the Okta user profile expression that maps to this "
            "attribute (e.g. \"user.email\", \"user.firstName\", \"user.lastName\", "
            "\"user.login\")."
        )
        attr_value = _prompt("Okta Value Expression")

        _instruction(
            "Enter the attribute namespace. Press Enter to accept the default."
        )
        attr_ns = _prompt(
            "Namespace",
            default="urn:oasis:names:tc:SAML:2.0:attrname-format:basic",
            required=False,
        )

        attribute_statements.append(
            {"name": attr_name, "namespace": attr_ns, "values": [attr_value]}
        )
        print(f"  {GREEN}Added attribute: {attr_name} = {attr_value}{RESET}")

        add_attrs = _prompt_yes_no("Add another attribute?", default=False)

    # ── Step 6: Group Assignment ─────────────────────────────────────────
    _step(6, total_steps, "Group Assignment")

    groups = _prompt_list(
        "Groups",
        "Enter Okta group names to assign to this app, separated by commas. "
        "These groups must already exist in Okta. Users in these groups will "
        "see the app on their Okta dashboard. Leave blank to skip.",
    )

    # ── Step 7: Review & Confirm ─────────────────────────────────────────
    _step(7, total_steps, "Review Configuration")

    app_def = {
        "label": label,
        "sso_acs_url": sso_acs_url,
        "audience_uri": audience_uri,
        "recipient_url": recipient_url,
        "destination_url": destination_url,
        "default_relay_state": default_relay_state,
        "name_id_format": name_id_format,
        "name_id_value": name_id_value,
        "response_signed": response_signed,
        "assertion_signed": assertion_signed,
        "signature_algorithm": signature_algorithm,
        "digest_algorithm": digest_algorithm,
        "honor_force_authn": honor_force_authn,
        "attribute_statements": attribute_statements,
        "groups_assigned": groups,
    }

    _print_review(app_def)

    return app_def


def _print_review(app_def: dict) -> None:
    """Pretty-print the configuration for user review."""
    print(f"\n  {BOLD}{'Field':<28} Value{RESET}")
    print(f"  {'─' * 58}")

    rows = [
        ("Application Name", app_def["label"]),
        ("SSO ACS URL", app_def["sso_acs_url"]),
        ("Audience URI", app_def["audience_uri"]),
        ("Recipient URL", app_def["recipient_url"]),
        ("Destination URL", app_def["destination_url"]),
        ("Default RelayState", app_def.get("default_relay_state") or "(none)"),
        ("NameID Format", app_def["name_id_format"].rsplit(":", 1)[-1]),
        ("NameID Value", app_def["name_id_value"]),
        ("Response Signed", "Yes" if app_def["response_signed"] else "No"),
        ("Assertion Signed", "Yes" if app_def["assertion_signed"] else "No"),
        ("Signature Algorithm", app_def["signature_algorithm"]),
        ("Digest Algorithm", app_def["digest_algorithm"]),
        ("Honor ForceAuthn", "Yes" if app_def["honor_force_authn"] else "No"),
    ]
    for field, value in rows:
        print(f"  {field:<28} {value}")

    attrs = app_def.get("attribute_statements", [])
    if attrs:
        print(f"\n  {BOLD}Attribute Statements:{RESET}")
        for a in attrs:
            vals = ", ".join(a["values"])
            print(f"    {a['name']:<24} -> {vals}")
    else:
        print(f"\n  {DIM}No attribute statements configured.{RESET}")

    groups = app_def.get("groups_assigned", [])
    if groups:
        print(f"\n  {BOLD}Groups:{RESET}")
        for g in groups:
            print(f"    - {g}")
    else:
        print(f"\n  {DIM}No groups assigned.{RESET}")

    print()


def interactive_wizard(dry_run: bool = False) -> None:
    """Run the full interactive wizard."""
    _banner("Okta SAML Application Configuration Wizard")
    print(
        f"  This wizard will walk you through configuring a SAML 2.0\n"
        f"  application in Okta. You will be prompted for each field\n"
        f"  with instructions on what to enter.\n"
        f"\n"
        f"  {DIM}Press Enter to accept [default] values shown in brackets.{RESET}\n"
        f"  {DIM}Press Ctrl+C at any time to cancel.{RESET}"
    )

    # ── Credentials ──────────────────────────────────────────────────────
    org_url, api_token = prompt_credentials()

    # Validate connection before continuing
    if not dry_run:
        print(f"\n  {DIM}Verifying connection to Okta...{RESET}", end=" ", flush=True)
        try:
            client = OktaClient(org_url, api_token)
            client.get("/org")
            print(f"{GREEN}Connected.{RESET}")
        except requests.exceptions.HTTPError as exc:
            print(f"{RED}Failed.{RESET}")
            print(f"\n  {RED}Could not connect to Okta: {exc}{RESET}")
            print(f"  {RED}Check your Org URL and API token, then try again.{RESET}")
            sys.exit(1)
        except requests.exceptions.ConnectionError:
            print(f"{RED}Failed.{RESET}")
            print(f"\n  {RED}Could not reach {org_url}. Check the URL and your network.{RESET}")
            sys.exit(1)
    else:
        client = OktaClient(org_url, api_token)

    # ── Main menu loop ───────────────────────────────────────────────────
    while True:
        _banner("What would you like to do?")
        action = _prompt_choice(
            "Choose an action:",
            {
                "1": "Configure a new SAML application",
                "2": "Configure apps from YAML file (config/saml_apps.yaml)",
                "3": "Export IdP metadata for an existing app",
                "4": "Exit",
            },
            default="1",
        )

        if action == "Configure a new SAML application":
            _interactive_new_app(client, dry_run)
        elif action == "Configure apps from YAML file (config/saml_apps.yaml)":
            _interactive_yaml_batch(client, dry_run)
        elif action == "Export IdP metadata for an existing app":
            _interactive_export_metadata(client)
        else:
            print(f"\n  {GREEN}Goodbye!{RESET}\n")
            break


def _interactive_new_app(client: OktaClient, dry_run: bool) -> None:
    """Interactively collect app details, confirm, and configure."""
    app_def = prompt_app_details()

    if not _prompt_yes_no("Proceed with this configuration?", default=True):
        print(f"  {YELLOW}Cancelled. No changes were made.{RESET}")
        return

    # Ask if user wants to save to YAML
    save_yaml = _prompt_yes_no(
        "Save this app definition to config/saml_apps.yaml for future use?",
        default=True,
    )

    if dry_run:
        print(f"\n  {YELLOW}[DRY-RUN] Validated configuration — no API calls made.{RESET}")
        payload = build_saml_payload(app_def, {})
        print(f"\n  {DIM}API payload that would be sent:{RESET}")
        print(json.dumps(payload, indent=2))
    else:
        print(f"\n  {DIM}Configuring in Okta...{RESET}")
        result = configure_app(client, app_def, {}, dry_run=False)
        if result:
            print(f"\n  {GREEN}Application configured successfully!{RESET}")
            print(f"  {BOLD}App ID:{RESET}  {result['id']}")
            print(f"  {BOLD}Label:{RESET}   {result['label']}")
            print(f"  {BOLD}Status:{RESET}  {result.get('status', 'UNKNOWN')}")

            # Offer to show metadata
            if _prompt_yes_no("Download and display the IdP metadata XML?", default=False):
                print(f"\n{DIM}--- IdP Metadata XML ---{RESET}")
                print(client.get_app_metadata(result["id"]))
                print(f"{DIM}--- End Metadata ---{RESET}")

    if save_yaml:
        _save_app_to_yaml(app_def)
        print(f"  {GREEN}Saved to config/saml_apps.yaml.{RESET}")


def _interactive_yaml_batch(client: OktaClient, dry_run: bool) -> None:
    """Configure all apps defined in the YAML file with confirmation."""
    if not SAML_APPS_PATH.exists():
        print(f"  {RED}File not found: {SAML_APPS_PATH}{RESET}")
        print(f"  {DIM}Create config/saml_apps.yaml with your app definitions first.{RESET}")
        return

    apps_cfg = load_yaml(SAML_APPS_PATH)
    all_apps = apps_cfg.get("applications", [])

    if not all_apps:
        print(f"  {YELLOW}No applications defined in {SAML_APPS_PATH}.{RESET}")
        return

    print(f"\n  Found {BOLD}{len(all_apps)}{RESET} application(s) in config/saml_apps.yaml:\n")
    for i, app in enumerate(all_apps, 1):
        print(f"    {i}. {app['label']:<20}  ACS: {app['sso_acs_url']}")

    print()
    if not _prompt_yes_no(f"Configure all {len(all_apps)} application(s)?", default=True):
        # Let user pick specific apps
        indices = _prompt(
            "Enter app numbers to configure (comma-separated)",
            required=False,
        )
        if not indices:
            print(f"  {YELLOW}Cancelled.{RESET}")
            return
        selected = []
        for idx_str in indices.split(","):
            idx = int(idx_str.strip()) - 1
            if 0 <= idx < len(all_apps):
                selected.append(all_apps[idx])
        all_apps = selected

    if not all_apps:
        print(f"  {YELLOW}No apps selected.{RESET}")
        return

    # Show each app config and ask for confirmation
    okta_cfg = load_yaml(OKTA_CONFIG_PATH) if OKTA_CONFIG_PATH.exists() else {}
    defaults = okta_cfg.get("defaults", {})

    for app_def in all_apps:
        _banner(f"Configuring: {app_def['label']}")
        _print_review(app_def)

        if not _prompt_yes_no(f"Proceed with \"{app_def['label']}\"?", default=True):
            print(f"  {YELLOW}Skipped {app_def['label']}.{RESET}")
            continue

        if dry_run:
            print(f"  {YELLOW}[DRY-RUN] Would configure: {app_def['label']}{RESET}")
        else:
            result = configure_app(client, app_def, defaults, dry_run=False)
            if result:
                print(f"  {GREEN}Configured: {result['label']}  (id={result['id']}){RESET}")

    print(f"\n  {GREEN}Batch configuration complete.{RESET}")


def _interactive_export_metadata(client: OktaClient) -> None:
    """Prompt for an app label and export its metadata."""
    print()
    _instruction(
        "Enter the exact label of the Okta application whose IdP SAML "
        "metadata you want to download."
    )
    label = _prompt("Application Name")
    export_metadata(client, label)


def _save_app_to_yaml(app_def: dict) -> None:
    """Append an app definition to config/saml_apps.yaml."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if SAML_APPS_PATH.exists():
        apps_cfg = load_yaml(SAML_APPS_PATH)
    else:
        apps_cfg = {}
    apps_list = apps_cfg.get("applications", [])
    apps_list.append(app_def)
    apps_cfg["applications"] = apps_list
    with open(SAML_APPS_PATH, "w") as fh:
        yaml.dump(apps_cfg, fh, default_flow_style=False, sort_keys=False)


# ─── CLI ─────────────────────────────────────────────────────────────────────


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Configure standard SAML 2.0 applications in Okta.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            examples:
              %(prog)s                          Launch interactive wizard
              %(prog)s --batch                  Configure all apps from YAML
              %(prog)s --batch --app Workato    Configure one app from YAML
              %(prog)s --dry-run                Wizard in dry-run mode
              %(prog)s --export-metadata --app Workato
        """),
    )
    parser.add_argument(
        "--batch",
        action="store_true",
        help="Non-interactive mode: configure apps from config/saml_apps.yaml.",
    )
    parser.add_argument(
        "--app",
        help="Target a specific app by label (used with --batch or --export-metadata).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate configuration without calling the Okta API.",
    )
    parser.add_argument(
        "--export-metadata",
        action="store_true",
        help="Export IdP SAML metadata XML for --app.",
    )
    parser.add_argument(
        "--config",
        default=str(OKTA_CONFIG_PATH),
        help="Path to okta_config.yaml (default: config/okta_config.yaml).",
    )
    parser.add_argument(
        "--apps-file",
        default=str(SAML_APPS_PATH),
        help="Path to saml_apps.yaml (default: config/saml_apps.yaml).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # ── Non-interactive batch mode ───────────────────────────────────────
    if args.batch or args.export_metadata:
        okta_cfg = load_yaml(Path(args.config))
        defaults = okta_cfg.get("defaults", {})
        setup_logging(okta_cfg.get("logging", {}))

        org_url = os.environ.get("OKTA_ORG_URL") or okta_cfg.get("okta", {}).get("org_url", "")
        api_token = os.environ.get("OKTA_API_TOKEN") or okta_cfg.get("okta", {}).get("api_token", "")

        if not org_url or not api_token:
            logger.error(
                "OKTA_ORG_URL and OKTA_API_TOKEN must be set via environment "
                "variables or config/okta_config.yaml"
            )
            sys.exit(1)

        client = OktaClient(org_url, api_token)

        if args.export_metadata:
            if not args.app:
                logger.error("--export-metadata requires --app <label>")
                sys.exit(1)
            export_metadata(client, args.app)
            return

        apps_cfg = load_yaml(Path(args.apps_file))
        all_apps = apps_cfg.get("applications", [])
        if args.app:
            all_apps = [a for a in all_apps if a["label"] == args.app]
            if not all_apps:
                logger.error("No application with label '%s' in %s", args.app, args.apps_file)
                sys.exit(1)

        logger.info("Configuring %d SAML application(s)…", len(all_apps))
        results = []
        for app_def in all_apps:
            result = configure_app(client, app_def, defaults, dry_run=args.dry_run)
            if result:
                results.append(result)

        if args.dry_run:
            logger.info("Dry-run complete — no changes were made.")
        else:
            logger.info("Done. %d application(s) configured.", len(results))
            for r in results:
                logger.info("  - %s  (id=%s)", r["label"], r["id"])
        return

    # ── Interactive wizard (default) ─────────────────────────────────────
    try:
        interactive_wizard(dry_run=args.dry_run)
    except KeyboardInterrupt:
        print(f"\n\n  {YELLOW}Cancelled by user.{RESET}\n")
        sys.exit(130)


if __name__ == "__main__":
    main()
