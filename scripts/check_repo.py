from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

required = [
    "LICENSE", "NOTICE", "THIRD-PARTY-NOTICES.md",
    "FORK-NOTICE.md", "UPSTREAM.md",
    "static/logo.svg", "static/icon.svg", "static/icon.ico",
    "README.md", "README_PL.md"
]
for rel in required:
    if not (ROOT / rel).exists():
        errors.append(f"missing required file: {rel}")

# Privacy: publication tree must not contain actual case databases.
for pattern in ("*.db", "*.sqlite", "*.sqlite3"):
    for p in ROOT.rglob(pattern):
        if ".git" not in p.parts:
            errors.append(f"database must not be committed: {p.relative_to(ROOT)}")

notice = (ROOT / "NOTICE").read_text(encoding="utf-8", errors="ignore") if (ROOT/"NOTICE").exists() else ""
if "Andrea Cumini" not in notice:
    errors.append("upstream attribution missing from NOTICE")

html = (ROOT / "templates" / "index.html").read_text(encoding="utf-8", errors="ignore")
if "Andrea Cumini" not in html or "www.osintinfo.net" not in html:
    errors.append("required upstream UI attribution is missing")
if "<title>PolGraph OSINT</title>" not in html:
    errors.append("fork title is not PolGraph OSINT")

i18n = (ROOT / "static" / "i18n.js").read_text(encoding="utf-8", errors="ignore")
brands = re.findall(r"""['"]brand['"]\s*:\s*['"]([^'"]+)['"]""", i18n)
if not brands or any(b != "PolGraph OSINT" for b in brands):
    errors.append("not all i18n brand values use fork name")

# Avoid publishing the original trademarked artwork by content/title.
icon = (ROOT / "static" / "icon.svg").read_text(encoding="utf-8", errors="ignore")
if 'aria-label="OSInt Graph"' in icon or "<title>OSInt Graph</title>" in icon:
    errors.append("upstream icon artwork/name still present in distributed icon")

if errors:
    print("FAILED:")
    for e in errors:
        print(" -", e)
    sys.exit(1)

print("OK: repository is ready for public fork checks.")
