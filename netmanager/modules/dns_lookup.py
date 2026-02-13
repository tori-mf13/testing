"""DNS lookup utilities."""

import socket
import time


def lookup(hostname):
    """Resolve a hostname and return a result dict."""
    start = time.monotonic()
    try:
        results = socket.getaddrinfo(hostname, None)
    except socket.gaierror as e:
        return {"hostname": hostname, "error": str(e), "addresses": []}

    elapsed = (time.monotonic() - start) * 1000

    seen = set()
    addresses = []
    for family, _, _, _, sockaddr in results:
        addr = sockaddr[0]
        if addr not in seen:
            seen.add(addr)
            addr_type = "IPv4" if family == socket.AF_INET else "IPv6"
            addresses.append({"address": addr, "type": addr_type})

    return {
        "hostname": hostname,
        "addresses": addresses,
        "elapsed_ms": round(elapsed, 2),
        "error": None,
    }


def reverse_lookup(ip_address):
    """Perform a reverse DNS lookup on an IP address."""
    start = time.monotonic()
    try:
        hostname, _, _ = socket.gethostbyaddr(ip_address)
    except (socket.herror, socket.gaierror) as e:
        return {"ip": ip_address, "hostname": None, "error": str(e)}

    elapsed = (time.monotonic() - start) * 1000
    return {
        "ip": ip_address,
        "hostname": hostname,
        "elapsed_ms": round(elapsed, 2),
        "error": None,
    }


def format_lookup(result):
    """Return a human-readable string for a lookup result."""
    if result.get("error"):
        return f"  DNS lookup failed for {result['hostname']}: {result['error']}"

    lines = [f"  Hostname: {result['hostname']}  ({result['elapsed_ms']} ms)"]
    for addr in result["addresses"]:
        lines.append(f"    {addr['type']:4s}  {addr['address']}")
    return "\n".join(lines)


def format_reverse(result):
    """Return a human-readable string for a reverse lookup result."""
    if result.get("error"):
        return f"  Reverse lookup failed for {result['ip']}: {result['error']}"
    return (
        f"  {result['ip']} -> {result['hostname']}  "
        f"({result['elapsed_ms']} ms)"
    )
