#!/usr/bin/env python3
"""Configure standard SAML 2.0 applications in Okta.

Reads application definitions from config/saml_apps.yaml and creates (or
updates) the corresponding SAML apps in an Okta org via the Okta REST API.

Usage:
    # Configure all applications defined in the YAML file
    python okta_saml_config.py

    # Configure a single application by label
    python okta_saml_config.py --app "Workato"

    # Dry-run mode — validate config without making API calls
    python okta_saml_config.py --dry-run

    # Export IdP metadata for a configured application
    python okta_saml_config.py --export-metadata --app "Workato"

Environment variables (preferred over config file values):
    OKTA_ORG_URL    – e.g. https://your-org.okta.com
    OKTA_API_TOKEN  – Okta API token with app-admin scope
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
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

RATE_LIMIT_PAUSE = 1.0  # seconds to wait between API calls

logger = logging.getLogger("okta_saml_config")


# ─── Helpers ─────────────────────────────────────────────────────────────────


def load_yaml(path: Path) -> dict:
    """Load and return parsed YAML from *path*."""
    with open(path, "r") as fh:
        return yaml.safe_load(fh) or {}


def setup_logging(log_cfg: dict) -> None:
    """Configure the root logger from the logging section of okta_config."""
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

    # ── HTTP helpers ─────────────────────────────────────────────────────

    def _request(self, method: str, path: str, **kwargs: Any) -> requests.Response:
        url = f"{self.base_url}/api/v1{path}"
        resp = self.session.request(method, url, **kwargs)

        # Handle rate limiting
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

    # ── Application operations ───────────────────────────────────────────

    def find_app_by_label(self, label: str) -> dict | None:
        """Return the first app whose label matches *label*, or None."""
        apps = self.get("/apps", params={"q": label, "limit": 50})
        for app in apps:
            if app.get("label") == label:
                return app
        return None

    def create_saml_app(self, payload: dict) -> dict:
        """Create a new SAML 2.0 application."""
        logger.info("Creating SAML app: %s", payload.get("label"))
        app = self.post("/apps", payload)
        logger.info("Created app id=%s", app["id"])
        return app

    def update_saml_app(self, app_id: str, payload: dict) -> dict:
        """Update an existing SAML 2.0 application."""
        logger.info("Updating SAML app id=%s", app_id)
        return self.put(f"/apps/{app_id}", payload)

    def activate_app(self, app_id: str) -> None:
        """Activate an application."""
        self._request("POST", f"/apps/{app_id}/lifecycle/activate")
        logger.info("Activated app id=%s", app_id)

    def get_app_metadata(self, app_id: str) -> str:
        """Download the IdP SAML metadata XML for an application."""
        resp = self._request("GET", f"/apps/{app_id}/sso/saml/metadata")
        return resp.text

    # ── Group operations ─────────────────────────────────────────────────

    def find_group_by_name(self, name: str) -> dict | None:
        """Return the first group whose profile.name matches *name*."""
        groups = self.get("/groups", params={"q": name, "limit": 50})
        for g in groups:
            if g.get("profile", {}).get("name") == name:
                return g
        return None

    def assign_group_to_app(self, app_id: str, group_id: str) -> None:
        """Assign a group to an application."""
        self._request("PUT", f"/apps/{app_id}/groups/{group_id}", json={})
        logger.info("Assigned group %s to app %s", group_id, app_id)


# ─── Payload Builder ────────────────────────────────────────────────────────


def build_saml_payload(app_def: dict, defaults: dict) -> dict:
    """Build the Okta API JSON payload for a SAML 2.0 app from *app_def*."""

    def _val(key: str, fallback: Any = None) -> Any:
        return app_def.get(key, defaults.get(key, fallback))

    # Attribute statements
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

    payload: dict[str, Any] = {
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

    return payload


# ─── Core Logic ──────────────────────────────────────────────────────────────


def configure_app(
    client: OktaClient,
    app_def: dict,
    defaults: dict,
    dry_run: bool = False,
) -> dict | None:
    """Create or update a single SAML application and assign groups."""
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

    # Activate the app if it is not already active
    if app.get("status") != "ACTIVE":
        client.activate_app(app["id"])

    # Assign groups
    for group_name in app_def.get("groups_assigned", []):
        group = client.find_group_by_name(group_name)
        if group:
            client.assign_group_to_app(app["id"], group["id"])
        else:
            logger.warning("Group '%s' not found — skipping assignment", group_name)

    time.sleep(RATE_LIMIT_PAUSE)
    return app


def export_metadata(client: OktaClient, label: str) -> None:
    """Fetch and print IdP metadata for the app matching *label*."""
    app = client.find_app_by_label(label)
    if not app:
        logger.error("Application '%s' not found in Okta", label)
        sys.exit(1)
    metadata_xml = client.get_app_metadata(app["id"])
    print(metadata_xml)


# ─── CLI ─────────────────────────────────────────────────────────────────────


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Configure standard SAML 2.0 applications in Okta."
    )
    parser.add_argument(
        "--app",
        help="Configure only the app with this label (default: all apps).",
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

    # Load configuration
    okta_cfg = load_yaml(Path(args.config))
    apps_cfg = load_yaml(Path(args.apps_file))
    defaults = okta_cfg.get("defaults", {})

    setup_logging(okta_cfg.get("logging", {}))

    # Resolve credentials (env vars take precedence)
    org_url = os.environ.get("OKTA_ORG_URL") or okta_cfg.get("okta", {}).get("org_url", "")
    api_token = os.environ.get("OKTA_API_TOKEN") or okta_cfg.get("okta", {}).get("api_token", "")

    if not org_url or not api_token:
        logger.error(
            "OKTA_ORG_URL and OKTA_API_TOKEN must be set via environment "
            "variables or config/okta_config.yaml"
        )
        sys.exit(1)

    client = OktaClient(org_url, api_token)

    # Export metadata mode
    if args.export_metadata:
        if not args.app:
            logger.error("--export-metadata requires --app <label>")
            sys.exit(1)
        export_metadata(client, args.app)
        return

    # Build list of apps to configure
    all_apps: list[dict] = apps_cfg.get("applications", [])
    if args.app:
        all_apps = [a for a in all_apps if a["label"] == args.app]
        if not all_apps:
            logger.error("No application with label '%s' found in %s", args.app, args.apps_file)
            sys.exit(1)

    logger.info("Configuring %d SAML application(s)…", len(all_apps))

    results: list[dict] = []
    for app_def in all_apps:
        result = configure_app(client, app_def, defaults, dry_run=args.dry_run)
        if result:
            results.append(result)

    # Summary
    if args.dry_run:
        logger.info("Dry-run complete — no changes were made.")
    else:
        logger.info(
            "Done. %d application(s) configured successfully.", len(results)
        )
        for r in results:
            logger.info("  • %s  (id=%s)", r["label"], r["id"])


if __name__ == "__main__":
    main()
