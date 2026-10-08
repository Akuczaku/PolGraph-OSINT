# -*- coding: utf-8 -*-
from __future__ import annotations
import re
from urllib.parse import quote_plus

def digits(value: str) -> str:
    return re.sub(r"\\D+", "", value or "")

def validate_pesel(value: str) -> bool:
    s = digits(value)
    if len(s) != 11:
        return False
    w = [1,3,7,9,1,3,7,9,1,3]
    check = (10 - sum(int(s[i])*w[i] for i in range(10)) % 10) % 10
    return check == int(s[10])

def validate_nip(value: str) -> bool:
    s = digits(value)
    if len(s) != 10:
        return False
    w = [6,5,7,2,3,4,5,6,7]
    c = sum(int(s[i])*w[i] for i in range(9)) % 11
    return c != 10 and c == int(s[9])

def validate_regon(value: str) -> bool:
    s = digits(value)
    if len(s) == 9:
        w = [8,9,2,3,4,5,6,7]
        c = sum(int(s[i])*w[i] for i in range(8)) % 11
        if c == 10: c = 0
        return c == int(s[8])
    if len(s) == 14:
        w = [2,4,8,5,0,9,7,3,6,1,2,4,8]
        c = sum(int(s[i])*w[i] for i in range(13)) % 11
        if c == 10: c = 0
        return c == int(s[13])
    return False

def validate_krs(value: str) -> bool:
    return len(digits(value)) == 10

def validate_iban_pl(value: str) -> bool:
    s = re.sub(r"\\s+", "", (value or "")).upper()
    if re.fullmatch(r"\\d{26}", s):
        s = "PL" + s
    if not re.fullmatch(r"PL\\d{26}", s):
        return False
    rearranged = s[4:] + s[:4]
    numeric = "".join(str(ord(ch)-55) if ch.isalpha() else ch for ch in rearranged)
    return int(numeric) % 97 == 1

OFFICIAL = {
    "KRS": "https://wyszukiwarka-krs.ms.gov.pl/",
    "CEIDG": "https://aplikacja.ceidg.gov.pl/ceidg/ceidg.public.ui/search.aspx",
    "VAT": "https://www.podatki.gov.pl/wykaz-podatnikow-vat-wyszukiwarka",
    "REGON": "https://wyszukiwarkaregon.stat.gov.pl/appBIR/index.aspx",
    "BIP": "https://www.gov.pl/web/bip",
    "PRS": "https://prs.ms.gov.pl/",
}

def official_registry_links(identifier: str) -> list[dict]:
    s = digits(identifier)
    out = []
    if len(s) == 10:
        out += [
            {"name":"KRS", "url":OFFICIAL["KRS"]},
            {"name":"NIP / VAT", "url":OFFICIAL["VAT"]},
            {"name":"CEIDG", "url":OFFICIAL["CEIDG"]},
        ]
    if len(s) in (9,14):
        out.append({"name":"REGON", "url":OFFICIAL["REGON"]})
    return out

def classify_identifier(value: str) -> dict:
    s = digits(value)
    kinds = []
    if len(s) == 11 and validate_pesel(s): kinds.append("PESEL")
    if len(s) == 10 and validate_nip(s): kinds.append("NIP")
    if len(s) in (9,14) and validate_regon(s): kinds.append("REGON")
    if len(s) == 10 and validate_krs(s): kinds.append("KRS")
    if validate_iban_pl(value): kinds.append("IBAN_PL")
    return {"value": value, "normalized": s, "types": kinds}
