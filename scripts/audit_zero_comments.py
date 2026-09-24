import os
import sys
import re

EXTENSIONS_HASH = {".py", ".sh", ".yml", ".yaml", ".ini", ".conf", ".acl", ".template"}
EXTENSIONS_SLASH = {".cpp", ".h", ".c", ".js", ".ts", ".tsx", ".css"}
EXTENSIONS_HTML = {".html", ".xml"}

IGNORE_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    ".pio",
    "dist",
    ".pytest_cache",
    ".ruff_cache",
    "test-results",
    ".agent",
    ".agents",
    "data",
    "caddy_data",
    "caddy_config",
}

def remove_quoted_strings(line):
    res = re.sub(r'"(?:\\.|[^"\\])*"', '""', line)
    res = re.sub(r"'(?:\\.|[^'\\])*'", "''", res)
    res = re.sub(r"`(?:\\.|[^`\\])*`", "``", res)
    return res

def scan_file(filepath):
    _, ext = os.path.splitext(filepath)
    ext_lower = ext.lower()
    basename = os.path.basename(filepath)
    
    if ext_lower not in EXTENSIONS_HASH and ext_lower not in EXTENSIONS_SLASH and ext_lower not in EXTENSIONS_HTML:
        if basename != ".env.template" and basename != "Caddyfile":
            return []

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except Exception:
        return []

    violations = []
    in_block_comment = False
    in_triple_quote = False

    for idx, line in enumerate(lines, 1):
        stripped = line.strip()
        if not stripped:
            continue

        if idx == 1 and stripped.startswith("#!"):
            continue

        clean_line = remove_quoted_strings(line)
        clean_stripped = clean_line.strip()

        if ext_lower == ".py":
            if '"""' in stripped or "'''" in stripped:
                quote_token = '"""' if '"""' in stripped else "'''"
                occurrences = stripped.count(quote_token)
                if occurrences % 2 != 0:
                    in_triple_quote = not in_triple_quote
                continue
            if in_triple_quote:
                continue
            if clean_stripped.startswith("#"):
                violations.append((idx, line.rstrip()))
            elif " #" in clean_line:
                violations.append((idx, line.rstrip()))

        elif ext_lower in EXTENSIONS_HASH or basename in {".env.template", "Caddyfile"}:
            if clean_stripped.startswith("#"):
                violations.append((idx, line.rstrip()))

        elif ext_lower in EXTENSIONS_SLASH:
            if in_block_comment:
                violations.append((idx, line.rstrip()))
                if "*/" in clean_stripped:
                    in_block_comment = False
                continue
            if "/*" in clean_stripped:
                violations.append((idx, line.rstrip()))
                if "*/" not in clean_stripped:
                    in_block_comment = True
                continue
            if clean_stripped.startswith("//") or " //" in clean_line:
                violations.append((idx, line.rstrip()))

        elif ext_lower in EXTENSIONS_HTML:
            if "<!--" in clean_stripped:
                violations.append((idx, line.rstrip()))

    return violations

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    total_violations = 0
    scanned_files = 0

    for current_root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for filename in files:
            filepath = os.path.join(current_root, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            violations = scan_file(filepath)
            if violations:
                for line_no, line_content in violations:
                    print(f"VIOLATION: {rel_path}:{line_no} -> {line_content}")
                    total_violations += 1
            scanned_files += 1

    if total_violations > 0:
        print(f"FAILED: Found {total_violations} comment violations across {scanned_files} scanned files.")
        sys.exit(1)
    else:
        print(f"PASSED: 0 comment violations across {scanned_files} scanned files. Strict Zero-Comments Rule satisfied.")
        sys.exit(0)

if __name__ == "__main__":
    main()
