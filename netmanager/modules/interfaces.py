"""Network interface discovery and information."""

import socket
import psutil


def get_interfaces():
    """Return a list of dicts describing each network interface."""
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()
    io = psutil.net_io_counters(pernic=True)

    interfaces = []
    for name, addr_list in addrs.items():
        info = {
            "name": name,
            "is_up": stats[name].isup if name in stats else False,
            "speed_mbps": stats[name].speed if name in stats else 0,
            "mtu": stats[name].mtu if name in stats else 0,
            "ipv4": None,
            "netmask": None,
            "ipv6": None,
            "mac": None,
            "bytes_sent": 0,
            "bytes_recv": 0,
            "packets_sent": 0,
            "packets_recv": 0,
        }

        for addr in addr_list:
            if addr.family == socket.AF_INET:
                info["ipv4"] = addr.address
                info["netmask"] = addr.netmask
            elif addr.family == socket.AF_INET6:
                info["ipv6"] = addr.address
            elif addr.family == psutil.AF_LINK:
                info["mac"] = addr.address

        if name in io:
            info["bytes_sent"] = io[name].bytes_sent
            info["bytes_recv"] = io[name].bytes_recv
            info["packets_sent"] = io[name].packets_sent
            info["packets_recv"] = io[name].packets_recv

        interfaces.append(info)

    return interfaces


def format_interfaces(interfaces):
    """Return a human-readable string for a list of interfaces."""
    lines = []
    for iface in interfaces:
        status = "UP" if iface["is_up"] else "DOWN"
        lines.append(f"  {iface['name']} [{status}]")
        if iface["mac"]:
            lines.append(f"    MAC:      {iface['mac']}")
        if iface["ipv4"]:
            lines.append(f"    IPv4:     {iface['ipv4']}/{iface['netmask']}")
        if iface["ipv6"]:
            lines.append(f"    IPv6:     {iface['ipv6']}")
        if iface["speed_mbps"]:
            lines.append(f"    Speed:    {iface['speed_mbps']} Mbps")
        lines.append(f"    MTU:      {iface['mtu']}")
        lines.append(
            f"    Traffic:  sent {_human_bytes(iface['bytes_sent'])}, "
            f"recv {_human_bytes(iface['bytes_recv'])}"
        )
        lines.append(
            f"    Packets:  sent {iface['packets_sent']:,}, "
            f"recv {iface['packets_recv']:,}"
        )
        lines.append("")
    return "\n".join(lines)


def _human_bytes(n):
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} PB"
