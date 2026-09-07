#!/usr/bin/env bash

set -euo pipefail

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

TOTAL_STAGES=6
_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()
WRITTEN_SECRET=()
SKIPPED=()

_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1; then tput clear; else printf '\033[2J\033[3J\033[H'; fi
}

banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  You drive the browser; this wizard guides your clicks, generates\n' "$DIM"
  printf '  secure tokens, and populates your local configuration safely.\n'
  printf '  Stop any time with Ctrl-C and re-run later.%s\n\n' "$RESET"
  pause "Ready to start?"
}

stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

say()  { printf '  %s\n' "$1"; }
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v start        >/dev/null 2>&1; then start "$url"
    elif command -v wslview     >/dev/null 2>&1; then wslview "$url"
    elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open        >/dev/null 2>&1; then open "$url"
    else warn "Could not automatically launch browser; please open: $url"; fi
  } >/dev/null 2>&1 || warn "Could not automatically launch browser; please open: $url"
}

pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

ask() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -r input || true
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

ask_secret() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || true
  printf '\n'
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

write_env() {
  local key="$1" value="$2" tmp
  touch "$ENV_FILE"
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ saved%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set in GitHub Repo Settings > Secrets)")
  warn "gh CLI not authenticated; remember to set $name in GitHub repository settings"
}

finish() {
  _clear
  printf '\n%s%s  ✓ Stage 1 External Infrastructure Setup Complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "Saved ${#WRITTEN_ENV[@]} configuration values to $ENV_FILE"
  (( ${#WRITTEN_SECRET[@]} )) && note "Configured ${#WRITTEN_SECRET[@]} GitHub secrets via gh CLI"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "Manual verification items remaining:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

banner "SAOCS Stage 1 External Infrastructure Setup"

stage "Oracle Cloud Infrastructure (OCI) VM Provisioning"
say "We will provision an Always-Free Ampere A1 VM and reserve a static public IP."
open_url "https://cloud.oracle.com/compute/instances"
step "Click 'Create instance'."
step "Name: saocs-server"
step "Placement & Shape: Change shape to Ampere (VM.Standard.A1.Flex, 4 OCPU, 24 GB RAM)."
step "Image: Select Canonical Ubuntu 22.04 or 24.04 Minimal."
step "Networking: Select or create your VCN public subnet, assign a public IP."
step "SSH Keys: Save private key locally (e.g. ~/.ssh/saocs_oci_key) and upload the public key."
step "Click 'Create'. Once running, go to Networking > Reserved Public IPs and assign a static IP."
step "In VCN Security List, open Ingress ports: 80 (HTTP), 443 (HTTPS), 8883 (MQTT TLS), 22 (SSH)."
pause "Press Enter after the VM is created with its reserved static IP."

ask OCI_STATIC_IP "Enter the Reserved Static Public IP of your OCI VM:"
ask OCI_DEPLOY_USER "Enter the SSH username for the VM (default: ubuntu):"
[[ -z "$OCI_DEPLOY_USER" ]] && OCI_DEPLOY_USER="ubuntu"
write_env OCI_STATIC_IP "$OCI_STATIC_IP"

stage "DuckDNS Subdomain Registration"
say "Caddy requires a real domain pointed at your static IP for automatic Let's Encrypt TLS."
open_url "https://www.duckdns.org"
step "Sign in to DuckDNS."
step "Under 'sub domains', enter your desired subdomain (e.g. saocs or smart-office-abu)."
step "Click 'add domain'."
step "In the 'current ip' field next to your subdomain, enter your OCI Static IP: $OCI_STATIC_IP"
step "Click 'update ip'."
step "Copy the Account Token displayed at the top of the DuckDNS page."
pause "Press Enter once your subdomain is registered and points to $OCI_STATIC_IP."

ask DUCKDNS_SUBDOMAIN "Enter your full DuckDNS domain (e.g. saocs.duckdns.org):"
ask_secret DUCKDNS_TOKEN "Paste your DuckDNS Account Token:"
write_env DUCKDNS_DOMAIN "$DUCKDNS_SUBDOMAIN"
write_env DUCKDNS_TOKEN "$DUCKDNS_TOKEN"

stage "Google Cloud Console OAuth 2.0 Credentials"
say "Google OAuth handles verified first-time sign-in for registered office users."
open_url "https://console.cloud.google.com/apis/credentials"
step "Create or select the SAOCS Google Cloud Project."
step "Under 'APIs & Services' > 'OAuth consent screen', configure External user type."
step "Add Scopes: email, profile, openid."
step "Under 'Credentials', click 'Create Credentials' > 'OAuth client ID'."
step "Application type: Web application. Name: SAOCS Web Client."
step "Authorized JavaScript origins:"
step "  - https://$DUCKDNS_SUBDOMAIN"
step "  - http://localhost:5173"
step "Authorized redirect URIs:"
step "  - https://$DUCKDNS_SUBDOMAIN/api/auth/google/callback"
step "  - http://localhost:8000/api/auth/google/callback"
step "Click 'Create' and copy the Client ID and Client Secret."
pause "Press Enter when you have copied your Google OAuth credentials."

ask GOOGLE_CLIENT_ID "Paste Google OAuth Client ID:"
ask_secret GOOGLE_CLIENT_SECRET "Paste Google OAuth Client Secret:"
write_env GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID"
write_env GOOGLE_CLIENT_SECRET "$GOOGLE_CLIENT_SECRET"
write_env GOOGLE_REDIRECT_URI "https://$DUCKDNS_SUBDOMAIN/api/auth/google/callback"

stage "Application Cryptographic Secrets Generation"
say "Generating cryptographically strong random keys for JWT signing, MQTT, and OTA."

JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
MQTT_BACK_PASS=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)
MQTT_DEV_PASS=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)
OTA_PASS=$(openssl rand -hex 12 2>/dev/null || head -c 12 /dev/urandom | xxd -p)

write_env JWT_SECRET_KEY "$JWT_SECRET"
write_env MQTT_BACKEND_PASSWORD "$MQTT_BACK_PASS"
write_env MQTT_DEVICE_PASSWORD "$MQTT_DEV_PASS"
write_env OTA_PASSWORD "$OTA_PASS"
write_env TARIFF_RATE_PER_KWH "209.5"

note "Generated secure JWT secret, MQTT broker passwords, and ArduinoOTA password."
pause "Press Enter to proceed to GitHub Actions configuration."

stage "GitHub Actions Production Environment & Secrets"
say "We will configure GitHub Secrets for the automated deployment pipeline."
open_url "https://github.com/saxrael/SAOCS/settings/environments"
step "Click 'New environment' and name it 'production'."
step "Under 'Environment protection rules', check 'Required reviewers' and add your username."
step "Under 'Environment secrets', add the following secrets:"
step "  - OCI_VM_HOST: $OCI_STATIC_IP"
step "  - OCI_DEPLOY_USER: $OCI_DEPLOY_USER"
step "  - OCI_SSH_PRIVATE_KEY: (Contents of your deployment SSH private key)"
step "  - JWT_SECRET_KEY: (Automatically saved in your local .env)"
step "  - GOOGLE_CLIENT_ID: $GOOGLE_CLIENT_ID"
step "  - GOOGLE_CLIENT_SECRET: $GOOGLE_CLIENT_SECRET"
step "  - MQTT_BACKEND_PASSWORD: $MQTT_BACK_PASS"
pause "Press Enter once the 'production' environment and secrets are configured in GitHub."

set_secret "OCI_VM_HOST" "$OCI_STATIC_IP"
set_secret "OCI_DEPLOY_USER" "$OCI_DEPLOY_USER"
set_secret "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
set_secret "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
set_secret "JWT_SECRET_KEY" "$JWT_SECRET"
set_secret "MQTT_BACKEND_PASSWORD" "$MQTT_BACK_PASS"

stage "GPIO Pin Contract Confirmation"
say "Final verification before Stage 2 (Firmware Core) can commence."
step "Relay Outputs: GPIO 16 (Relay 1), GPIO 17 (Relay 2), GPIO 18 (Relay 3), GPIO 19 (Relay 4)"
step "Switch Inputs: GPIO 32 (Switch 1), GPIO 33 (Switch 2), GPIO 34 (Switch 3), GPIO 35 (Switch 4)"
say "Per TRD §6, this contract cannot be altered once Abdulfatai starts wiring."

if confirm "Has the GPIO Pin Contract been locked and confirmed with Abdulfatai?"; then
  printf '  %s✓ Pin contract locked.%s\n' "$GREEN" "$RESET"
else
  warn "Make sure to lock this contract before starting Stage 2 firmware development."
fi

finish
