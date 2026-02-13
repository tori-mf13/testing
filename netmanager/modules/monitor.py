"""Live network traffic monitoring."""

import time
import psutil


def snapshot():
    """Take a snapshot of current network I/O counters."""
    counters = psutil.net_io_counters()
    return {
        "time": time.monotonic(),
        "bytes_sent": counters.bytes_sent,
        "bytes_recv": counters.bytes_recv,
        "packets_sent": counters.packets_sent,
        "packets_recv": counters.packets_recv,
        "errin": counters.errin,
        "errout": counters.errout,
        "dropin": counters.dropin,
        "dropout": counters.dropout,
    }


def diff(snap1, snap2):
    """Compute the rate of change between two snapshots."""
    dt = snap2["time"] - snap1["time"]
    if dt <= 0:
        dt = 1

    return {
        "duration_sec": round(dt, 2),
        "send_rate": (snap2["bytes_sent"] - snap1["bytes_sent"]) / dt,
        "recv_rate": (snap2["bytes_recv"] - snap1["bytes_recv"]) / dt,
        "packets_sent": snap2["packets_sent"] - snap1["packets_sent"],
        "packets_recv": snap2["packets_recv"] - snap1["packets_recv"],
        "errors_in": snap2["errin"] - snap1["errin"],
        "errors_out": snap2["errout"] - snap1["errout"],
        "drops_in": snap2["dropin"] - snap1["dropin"],
        "drops_out": snap2["dropout"] - snap1["dropout"],
    }


def get_connections(kind="inet"):
    """Return a list of active network connections."""
    conns = psutil.net_connections(kind=kind)
    result = []
    for c in conns:
        local = f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else "-"
        remote = f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else "-"
        result.append({
            "local": local,
            "remote": remote,
            "status": c.status,
            "pid": c.pid,
        })
    result.sort(key=lambda c: c["local"])
    return result


def format_diff(d):
    """Format a snapshot diff as a one-line status."""
    return (
        f"  Upload: {_human_rate(d['send_rate'])}  |  "
        f"Download: {_human_rate(d['recv_rate'])}  |  "
        f"Pkts: {d['packets_sent']}↑ {d['packets_recv']}↓  |  "
        f"Errors: {d['errors_in'] + d['errors_out']}  "
        f"Drops: {d['drops_in'] + d['drops_out']}"
    )


def format_connections(conns, limit=25):
    """Format active connections as a table."""
    lines = [
        f"  {'LOCAL':<25} {'REMOTE':<25} {'STATUS':<15} PID",
        f"  {'-'*70}",
    ]
    for c in conns[:limit]:
        pid = str(c["pid"]) if c["pid"] else "-"
        lines.append(
            f"  {c['local']:<25} {c['remote']:<25} {c['status']:<15} {pid}"
        )
    if len(conns) > limit:
        lines.append(f"  ... and {len(conns) - limit} more connections")
    return "\n".join(lines)


def _human_rate(bps):
    """Convert bytes/sec to a human-readable rate."""
    for unit in ("B/s", "KB/s", "MB/s", "GB/s"):
        if bps < 1024:
            return f"{bps:.1f} {unit}"
        bps /= 1024
    return f"{bps:.1f} TB/s"
