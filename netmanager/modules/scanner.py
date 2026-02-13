"""TCP port scanner with concurrent scanning support."""

import socket
import concurrent.futures
import time

COMMON_PORTS = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    143: "IMAP",
    443: "HTTPS",
    445: "SMB",
    993: "IMAPS",
    995: "POP3S",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    5900: "VNC",
    6379: "Redis",
    8080: "HTTP-Alt",
    8443: "HTTPS-Alt",
    27017: "MongoDB",
}


def scan_port(host, port, timeout=1.0):
    """Check if a single TCP port is open. Returns (port, is_open, banner)."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            if result == 0:
                banner = _grab_banner(sock)
                return (port, True, banner)
            return (port, False, None)
    except (socket.timeout, OSError):
        return (port, False, None)


def _grab_banner(sock):
    """Try to read a banner from an open socket."""
    try:
        sock.settimeout(1.0)
        banner = sock.recv(1024).decode("utf-8", errors="replace").strip()
        return banner if banner else None
    except (socket.timeout, OSError):
        return None


def scan(host, ports=None, timeout=1.0, max_workers=100):
    """
    Scan a host for open ports.

    Args:
        host: Target hostname or IP.
        ports: List of ports to scan, or None for common ports.
        timeout: Connection timeout per port in seconds.
        max_workers: Max concurrent threads.

    Returns:
        Dict with host, open_ports list, scan duration, etc.
    """
    if ports is None:
        ports = sorted(COMMON_PORTS.keys())

    # Resolve hostname first
    try:
        ip = socket.gethostbyname(host)
    except socket.gaierror as e:
        return {"host": host, "ip": None, "error": str(e), "open_ports": []}

    start = time.monotonic()
    open_ports = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(scan_port, ip, port, timeout): port for port in ports
        }
        for future in concurrent.futures.as_completed(futures):
            port, is_open, banner = future.result()
            if is_open:
                service = COMMON_PORTS.get(port, "unknown")
                open_ports.append({
                    "port": port,
                    "service": service,
                    "banner": banner,
                })

    elapsed = time.monotonic() - start
    open_ports.sort(key=lambda p: p["port"])

    return {
        "host": host,
        "ip": ip,
        "ports_scanned": len(ports),
        "open_ports": open_ports,
        "elapsed_sec": round(elapsed, 2),
        "error": None,
    }


def format_scan(result):
    """Return a human-readable scan report."""
    if result.get("error"):
        return f"  Scan failed for {result['host']}: {result['error']}"

    lines = [
        f"  Target: {result['host']} ({result['ip']})",
        f"  Scanned {result['ports_scanned']} ports "
        f"in {result['elapsed_sec']}s",
        "",
    ]

    if not result["open_ports"]:
        lines.append("  No open ports found.")
    else:
        lines.append(
            f"  {'PORT':<8} {'STATE':<8} {'SERVICE':<15} BANNER"
        )
        lines.append(f"  {'-'*50}")
        for p in result["open_ports"]:
            banner = p["banner"] or ""
            if len(banner) > 40:
                banner = banner[:37] + "..."
            lines.append(
                f"  {p['port']:<8} {'open':<8} {p['service']:<15} {banner}"
            )

    return "\n".join(lines)
