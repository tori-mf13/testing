#!/usr/bin/env bash
#
# Dev Environment Setup Script
# Installs and configures common development tools on Linux (Ubuntu/Debian).
# Usage: ./setup.sh [--all | --minimal | --category ...]
# Run ./setup.sh --help for details.

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors & helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { printf "${BLUE}[INFO]${NC}  %s\n" "$*"; }
success() { printf "${GREEN}[ OK ]${NC}  %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
error()   { printf "${RED}[ERR ]${NC}  %s\n" "$*" >&2; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
if [[ "$(uname)" != "Linux" ]]; then
    error "This script is designed for Linux (Ubuntu/Debian). Detected: $(uname)"
    exit 1
fi

if ! command -v apt-get &>/dev/null; then
    error "apt-get not found. This script requires an apt-based distribution."
    exit 1
fi

if [[ $EUID -eq 0 ]]; then
    warn "Running as root. Packages will be installed system-wide."
    SUDO=""
else
    SUDO="sudo"
fi

# ---------------------------------------------------------------------------
# Category definitions
# ---------------------------------------------------------------------------
CATEGORIES=(essentials git node python docker cli)

install_essentials() {
    info "Installing essential packages..."
    $SUDO apt-get update -qq
    $SUDO apt-get install -y -qq \
        build-essential \
        curl \
        wget \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release
    success "Essentials installed."
}

install_git() {
    info "Installing and configuring Git..."
    $SUDO apt-get install -y -qq git

    if ! git config --global user.name &>/dev/null; then
        read -rp "Git user.name: " git_name
        git config --global user.name "$git_name"
    fi
    if ! git config --global user.email &>/dev/null; then
        read -rp "Git user.email: " git_email
        git config --global user.email "$git_email"
    fi

    git config --global init.defaultBranch main
    git config --global pull.rebase false
    git config --global core.editor "vim"

    success "Git $(git --version | awk '{print $3}') configured."
}

install_node() {
    info "Installing Node.js (LTS) via nvm..."
    if [[ -d "$HOME/.nvm" ]]; then
        warn "nvm already installed, skipping download."
    else
        curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    fi

    export NVM_DIR="$HOME/.nvm"
    # shellcheck source=/dev/null
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

    nvm install --lts
    nvm use --lts

    success "Node.js $(node --version) installed with npm $(npm --version)."
}

install_python() {
    info "Installing Python 3 and pip..."
    $SUDO apt-get install -y -qq python3 python3-pip python3-venv

    success "Python $(python3 --version | awk '{print $2}') installed."
}

install_docker() {
    info "Installing Docker..."
    if command -v docker &>/dev/null; then
        warn "Docker already installed, skipping."
        success "Docker $(docker --version | awk '{print $3}' | tr -d ,) found."
        return
    fi

    $SUDO install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    $SUDO chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null

    $SUDO apt-get update -qq
    $SUDO apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

    if [[ $EUID -ne 0 ]]; then
        $SUDO usermod -aG docker "$USER"
        warn "Added $USER to docker group. Log out and back in for this to take effect."
    fi

    success "Docker installed."
}

install_cli() {
    info "Installing CLI utilities..."
    $SUDO apt-get install -y -qq \
        jq \
        htop \
        tree \
        tmux \
        ripgrep \
        fd-find \
        bat \
        shellcheck

    success "CLI utilities installed."
}

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
    cat <<EOF
Dev Environment Setup Script

Usage:
  ./setup.sh --all                Install everything
  ./setup.sh --minimal            Install essentials + git + cli only
  ./setup.sh --category [...]     Install specific categories

Available categories:
  essentials    Build tools, curl, wget, etc.
  git           Git + global configuration
  node          Node.js LTS via nvm
  python        Python 3 + pip + venv
  docker        Docker Engine + Compose plugin
  cli           jq, htop, tree, tmux, ripgrep, fd, bat, shellcheck

Examples:
  ./setup.sh --all
  ./setup.sh --minimal
  ./setup.sh essentials git node
  ./setup.sh docker python

Options:
  --help        Show this help message
  --list        List available categories
  --dry-run     Show what would be installed without installing
EOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    if [[ $# -eq 0 ]]; then
        usage
        exit 0
    fi

    local dry_run=false
    local selected=()

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help)
                usage
                exit 0
                ;;
            --list)
                echo "Available categories: ${CATEGORIES[*]}"
                exit 0
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --all)
                selected=("${CATEGORIES[@]}")
                shift
                ;;
            --minimal)
                selected=(essentials git cli)
                shift
                ;;
            *)
                if printf '%s\n' "${CATEGORIES[@]}" | grep -qx "$1"; then
                    selected+=("$1")
                else
                    error "Unknown category: $1"
                    echo "Run ./setup.sh --list to see available categories."
                    exit 1
                fi
                shift
                ;;
        esac
    done

    if [[ ${#selected[@]} -eq 0 ]]; then
        error "No categories selected."
        usage
        exit 1
    fi

    # Remove duplicates while preserving order
    local unique=()
    for cat in "${selected[@]}"; do
        if ! printf '%s\n' "${unique[@]}" | grep -qx "$cat" 2>/dev/null; then
            unique+=("$cat")
        fi
    done

    echo ""
    info "Categories to install: ${unique[*]}"
    echo ""

    if $dry_run; then
        info "[DRY RUN] The following would be installed:"
        for cat in "${unique[@]}"; do
            echo "  - $cat"
        done
        exit 0
    fi

    for cat in "${unique[@]}"; do
        "install_${cat}"
        echo ""
    done

    echo "========================================="
    success "Dev environment setup complete!"
    echo "========================================="
}

main "$@"
