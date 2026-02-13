# Dev Environment Setup

A Bash script that installs and configures common development tools on Ubuntu/Debian Linux.

## Quick Start

```bash
chmod +x setup.sh

# Install everything
./setup.sh --all

# Install only essentials, git, and CLI tools
./setup.sh --minimal

# Pick specific categories
./setup.sh essentials git node
```

## Available Categories

| Category     | What it installs                                          |
|------------- |-----------------------------------------------------------|
| `essentials` | build-essential, curl, wget, unzip, ca-certificates, etc. |
| `git`        | Git + interactive global config (name, email)             |
| `node`       | Node.js LTS via nvm                                      |
| `python`     | Python 3, pip, venv                                      |
| `docker`     | Docker Engine + Compose plugin                            |
| `cli`        | jq, htop, tree, tmux, ripgrep, fd, bat, shellcheck       |

## Options

```
--all        Install all categories
--minimal    Install essentials + git + cli
--dry-run    Preview what would be installed
--list       List available categories
--help       Show usage info
```

## Examples

```bash
# See what --all would install without actually installing
./setup.sh --dry-run --all

# Set up a Python + Node web dev environment
./setup.sh essentials git node python cli

# Just add Docker to an existing setup
./setup.sh docker
```
