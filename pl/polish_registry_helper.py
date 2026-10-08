# -*- coding: utf-8 -*-
import sys, webbrowser
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from polish_osint_tools import classify_identifier, official_registry_links

print("OSInt Graph PL 1.1 — pomocnik rejestrów")
print("Wpisz PESEL/NIP/REGON/KRS/IBAN albo ENTER aby zakończyć.")
while True:
    q = input("> ").strip()
    if not q:
        break
    info = classify_identifier(q)
    print("Rozpoznanie:", ", ".join(info["types"]) or "brak pewnego rozpoznania")
    links = official_registry_links(q)
    for i, item in enumerate(links, 1):
        print(f"{i}. {item['name']}: {item['url']}")
    if links:
        ans = input("Otworzyć pierwszy oficjalny rejestr? [t/N] ").strip().lower()
        if ans in ("t","tak","y","yes"):
            webbrowser.open(links[0]["url"])
