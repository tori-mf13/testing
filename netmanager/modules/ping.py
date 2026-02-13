"""Ping / connectivity check utilities."""

import subprocess
import re
import platform


def ping(host, count=4, timeout=5):
    """Ping a host and return structured results."""
    system = platform.system().lower()
    if system == "windows":
        cmd = ["ping", "-n", str(count), "-w", str(timeout * 1000), host]
    else:
        cmd = ["ping", "-c", str(count), "-W", str(timeout), host]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout * count + 10
        )
        output = result.stdout + result.stderr
        return _parse_ping(host, output, result.returncode)
    except subprocess.TimeoutExpired:
        return {
            "host": host,
            "reachable": False,
            "packets_sent": count,
            "packets_recv": 0,
            "packet_loss": 100.0,
            "min_ms": None,
            "avg_ms": None,
            "max_ms": None,
            "error": "Timed out",
        }
    except FileNotFoundError:
        return {
            "host": host,
            "reachable": False,
            "error": "ping command not found",
        }


def _parse_ping(host, output, returncode):
    """Parse ping command output into a result dict."""
    result = {
        "host": host,
        "reachable": returncode == 0,
        "packets_sent": 0,
        "packets_recv": 0,
        "packet_loss": 100.0,
        "min_ms": None,
        "avg_ms": None,
        "max_ms": None,
        "raw": output,
        "error": None,
    }

    # Parse packet stats: "4 packets transmitted, 4 received, 0% packet loss"
    pkt = re.search(
        r"(\d+)\s+packets?\s+transmitted.*?(\d+)\s+received.*?"
        r"([\d.]+)%\s+packet\s+loss",
        output,
    )
    if pkt:
        result["packets_sent"] = int(pkt.group(1))
        result["packets_recv"] = int(pkt.group(2))
        result["packet_loss"] = float(pkt.group(3))

    # Parse rtt stats: "rtt min/avg/max/mdev = 1.234/5.678/9.012/1.234 ms"
    rtt = re.search(
        r"(?:rtt|round-trip)\s+min/avg/max/(?:mdev|stddev)\s*=\s*"
        r"([\d.]+)/([\d.]+)/([\d.]+)",
        output,
    )
    if rtt:
        result["min_ms"] = float(rtt.group(1))
        result["avg_ms"] = float(rtt.group(2))
        result["max_ms"] = float(rtt.group(3))

    return result


def format_ping(result):
    """Return a human-readable summary of ping results."""
    if result.get("error"):
        return f"  Ping {result['host']}: {result['error']}"

    status = "reachable" if result["reachable"] else "unreachable"
    lines = [f"  {result['host']} is {status}"]
    lines.append(
        f"    Packets: {result['packets_sent']} sent, "
        f"{result['packets_recv']} received, "
        f"{result['packet_loss']}% loss"
    )
    if result["avg_ms"] is not None:
        lines.append(
            f"    RTT:     min={result['min_ms']}ms "
            f"avg={result['avg_ms']}ms "
            f"max={result['max_ms']}ms"
        )
    return "\n".join(lines)
