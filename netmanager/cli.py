"""CLI entry point for the network management tool."""

import argparse
import sys
import time

from netmanager.modules import interfaces, dns_lookup, ping, scanner, monitor


def cmd_interfaces(args):
    """Show network interface information."""
    ifaces = interfaces.get_interfaces()
    print("\nNetwork Interfaces")
    print("=" * 50)
    print(interfaces.format_interfaces(ifaces))


def cmd_ping(args):
    """Ping a host."""
    print(f"\nPinging {args.host} ({args.count} packets)...")
    print("=" * 50)
    result = ping.ping(args.host, count=args.count, timeout=args.timeout)
    print(ping.format_ping(result))


def cmd_dns(args):
    """Perform DNS lookup."""
    print(f"\nDNS Lookup")
    print("=" * 50)
    if args.reverse:
        result = dns_lookup.reverse_lookup(args.host)
        print(dns_lookup.format_reverse(result))
    else:
        result = dns_lookup.lookup(args.host)
        print(dns_lookup.format_lookup(result))


def cmd_scan(args):
    """Scan ports on a host."""
    ports = None
    if args.ports:
        ports = _parse_port_range(args.ports)

    print(f"\nPort Scan: {args.host}")
    print("=" * 50)
    print("  Scanning (this may take a moment)...")
    result = scanner.scan(
        args.host, ports=ports, timeout=args.timeout, max_workers=args.threads
    )
    print(scanner.format_scan(result))


def cmd_monitor(args):
    """Monitor live network traffic."""
    print("\nNetwork Monitor (Ctrl+C to stop)")
    print("=" * 50)
    try:
        prev = monitor.snapshot()
        while True:
            time.sleep(args.interval)
            curr = monitor.snapshot()
            d = monitor.diff(prev, curr)
            # Clear line and reprint
            sys.stdout.write("\r\033[K")
            sys.stdout.write(monitor.format_diff(d))
            sys.stdout.flush()
            prev = curr
    except KeyboardInterrupt:
        print("\n\n  Monitor stopped.")


def cmd_connections(args):
    """Show active network connections."""
    print("\nActive Connections")
    print("=" * 50)
    conns = monitor.get_connections()
    print(monitor.format_connections(conns, limit=args.limit))
    print(f"\n  Total: {len(conns)} connections")


def _parse_port_range(port_str):
    """Parse a port specification like '80,443,8000-8100' into a list."""
    ports = []
    for part in port_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            ports.extend(range(int(start), int(end) + 1))
        else:
            ports.append(int(part))
    return sorted(set(ports))


def main():
    parser = argparse.ArgumentParser(
        prog="netmanager",
        description="Network management and diagnostic tool",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # interfaces
    subparsers.add_parser("interfaces", help="Show network interface info")

    # ping
    p_ping = subparsers.add_parser("ping", help="Ping a host")
    p_ping.add_argument("host", help="Hostname or IP to ping")
    p_ping.add_argument("-c", "--count", type=int, default=4, help="Packet count")
    p_ping.add_argument("-t", "--timeout", type=int, default=5, help="Timeout in sec")

    # dns
    p_dns = subparsers.add_parser("dns", help="DNS lookup")
    p_dns.add_argument("host", help="Hostname or IP to look up")
    p_dns.add_argument("-r", "--reverse", action="store_true", help="Reverse lookup")

    # scan
    p_scan = subparsers.add_parser("scan", help="Scan ports on a host")
    p_scan.add_argument("host", help="Target hostname or IP")
    p_scan.add_argument(
        "-p", "--ports", help="Ports to scan (e.g. '80,443,8000-8100')"
    )
    p_scan.add_argument(
        "-t", "--timeout", type=float, default=1.0, help="Timeout per port"
    )
    p_scan.add_argument(
        "--threads", type=int, default=100, help="Max concurrent threads"
    )

    # monitor
    p_mon = subparsers.add_parser("monitor", help="Live network traffic monitor")
    p_mon.add_argument(
        "-i", "--interval", type=float, default=1.0, help="Update interval in sec"
    )

    # connections
    p_conn = subparsers.add_parser("connections", help="Show active connections")
    p_conn.add_argument(
        "-l", "--limit", type=int, default=25, help="Max connections to show"
    )

    args = parser.parse_args()

    commands = {
        "interfaces": cmd_interfaces,
        "ping": cmd_ping,
        "dns": cmd_dns,
        "scan": cmd_scan,
        "monitor": cmd_monitor,
        "connections": cmd_connections,
    }

    if args.command is None:
        parser.print_help()
        sys.exit(1)

    commands[args.command](args)


if __name__ == "__main__":
    main()
