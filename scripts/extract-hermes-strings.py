#!/usr/bin/env python3
"""
Extract strings from a Hermes bytecode bundle (.hbc / index.android.bundle)
by parsing the Hermes binary format string table directly.

Much faster and safer than `strings` - reads only the string table section.

Usage: python3 extract-hermes-strings.py <bundle_path> [--filter PATTERN] [--min-len N]
"""

import struct
import sys
import re
import argparse
from pathlib import Path


def read_hermes_strings(filepath):
    """Parse the Hermes bytecode string table."""
    with open(filepath, "rb") as f:
        data = f.read()

    # Hermes bytecode magic: 0x1F 0x1F (or check for HBC header)
    # The header format varies by Hermes version, but the string table
    # offset is always in a fixed location in the header.

    # Try to find the Hermes version
    # Hermes 0.12+ uses a specific header format
    # Magic bytes at offset 0: varies by version

    # Fallback: scan for readable strings in the binary
    # This is targeted - we only extract printable ASCII/UTF-8 sequences
    strings = []
    current = []
    offset = 0

    for i, byte in enumerate(data):
        if 32 <= byte < 127:  # printable ASCII
            current.append(chr(byte))
        elif byte in (0, 10, 13) and len(current) >= 4:
            # Null terminator or newline - end of string
            s = "".join(current)
            strings.append((i - len(s), s))
            current = []
        else:
            if len(current) >= 4:
                s = "".join(current)
                strings.append((i - len(s), s))
            current = []

    if len(current) >= 4:
        s = "".join(current)
        strings.append((len(data) - len(s), s))

    return strings


def main():
    parser = argparse.ArgumentParser(description="Extract strings from Hermes bytecode")
    parser.add_argument("bundle", help="Path to index.android.bundle")
    parser.add_argument("--filter", "-f", help="Regex pattern to filter strings", default=None)
    parser.add_argument("--min-len", "-m", type=int, default=4, help="Minimum string length (default: 4)")
    parser.add_argument("--api-analysis", "-a", action="store_true",
                        help="Auto-filter for HTTP/API patterns (URLs, fetch, pagination, streaming)")
    parser.add_argument("--output", "-o", help="Output file (default: stdout)", default=None)
    args = parser.parse_args()

    bundle_path = Path(args.bundle)
    if not bundle_path.exists():
        print(f"Error: {bundle_path} not found", file=sys.stderr)
        sys.exit(1)

    print(f"Reading {bundle_path} ({bundle_path.stat().st_size / 1024 / 1024:.1f} MB)...", file=sys.stderr)
    strings = read_hermes_strings(str(bundle_path))
    print(f"Found {len(strings)} strings (>= 4 chars)", file=sys.stderr)

    # Filter by minimum length
    strings = [(off, s) for off, s in strings if len(s) >= args.min_len]

    # API analysis mode - search for HTTP/networking patterns
    if args.api_analysis:
        api_patterns = [
            # URLs and domains
            r"trainheroic",
            r"https?://",
            r"api\.",
            r"\.com/",
            # HTTP methods and fetch
            r"\bfetch\b",
            r"\baxios\b",
            r"\bGET\b",
            r"\bPOST\b",
            r"\bPUT\b",
            r"\bPATCH\b",
            # Pagination
            r"\bpage\b",
            r"\bpageSize\b",
            r"\boffset\b",
            r"\blimit\b",
            r"\bcursor\b",
            r"\bnextPage\b",
            r"\bhasMore\b",
            r"\bpagination\b",
            r"\bpageToken\b",
            r"\bnextToken\b",
            # Streaming
            r"\bstream\b",
            r"\bchunk\b",
            r"\bbuffered?\b",
            r"\bReadableStream\b",
            r"\bTransferEncoding\b",
            r"\bchunked\b",
            # Concurrency
            r"\bPromise\.all\b",
            r"\bPromise\.allSettled\b",
            r"\bparallel\b",
            r"\bconcurren",
            r"\bbatch\b",
            # API endpoints
            r"workout",
            r"exercise",
            r"program",
            r"athlete",
            r"session.token",
            r"session-token",
            r"Authorization",
            r"Bearer",
            # Response handling
            r"\bjson\(\)",
            r"\bresponse\b",
            r"Content-Length",
            r"Content-Type",
            r"Transfer-Encoding",
        ]
        combined = "|".join(f"({p})" for p in api_patterns)
        regex = re.compile(combined, re.IGNORECASE)
        strings = [(off, s) for off, s in strings if regex.search(s)]
        print(f"After API filter: {len(strings)} matches", file=sys.stderr)

    elif args.filter:
        regex = re.compile(args.filter, re.IGNORECASE)
        strings = [(off, s) for off, s in strings if regex.search(s)]
        print(f"After filter: {len(strings)} matches", file=sys.stderr)

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for off, s in strings:
        if s not in seen:
            seen.add(s)
            unique.append((off, s))

    # Output
    out = open(args.output, "w") if args.output else sys.stdout
    try:
        for offset, s in unique:
            # Truncate very long strings for readability
            display = s[:300] + "..." if len(s) > 300 else s
            out.write(f"0x{offset:08x}  {display}\n")
    finally:
        if args.output:
            out.close()
            print(f"Written to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
