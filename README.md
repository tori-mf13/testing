# Dev Toolkit

A collection of developer utilities: environment setup script and network management tool.

---

## Dev Environment Setup (`setup.sh`)

Installs and configures common development tools on Ubuntu/Debian Linux.

```bash
chmod +x setup.sh

./setup.sh --all          # Install everything
./setup.sh --minimal      # Essentials + git + CLI tools
./setup.sh essentials git node   # Pick specific categories
./setup.sh --dry-run --all       # Preview without installing
```

**Categories:** `essentials` `git` `node` `python` `docker` `cli`

---

## Network Manager (`netmanager/`)

A Python CLI tool for network diagnostics and monitoring.

### Install

```bash
pip install -r requirements.txt
```

### Usage

```bash
python -m netmanager <command> [options]
```

### Commands

| Command        | Description                           |
|--------------- |---------------------------------------|
| `interfaces`   | Show network interface details        |
| `ping <host>`  | Ping a host with stats                |
| `dns <host>`   | DNS / reverse DNS lookup              |
| `scan <host>`  | TCP port scanner                      |
| `monitor`      | Live network traffic monitor          |
| `connections`   | List active network connections       |

### Examples

```bash
# Show all network interfaces
python -m netmanager interfaces

# Ping a host with 10 packets
python -m netmanager ping 8.8.8.8 -c 10

# DNS lookup
python -m netmanager dns example.com

# Reverse DNS
python -m netmanager dns 8.8.8.8 --reverse

# Scan common ports on a host
python -m netmanager scan example.com

# Scan specific ports
python -m netmanager scan example.com -p 80,443,8000-8100

# Monitor live traffic (Ctrl+C to stop)
python -m netmanager monitor

# Show active connections
python -m netmanager connections -l 50
```
