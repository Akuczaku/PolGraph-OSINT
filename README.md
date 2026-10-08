**🇵🇱 Polski** | [🇬🇧 English](README_EN.md)

<p align="center">
  <img src="static/logo.svg" alt="PolGraph OSINT" width="520">
</p>

# PolGraph OSINT

**PolGraph OSINT** to niezależna, zmodyfikowana polska wersja projektu
[OSInt Graph](https://github.com/tingon11/OsintGraph) autorstwa **Andrea Cumini**.

Projekt zachowuje podstawowy model analizy grafowej oryginału, a jednocześnie dodaje
pełną polską lokalizację, polski manual, opcjonalny profil **Polski OSINT**
oraz narzędzia do pracy z własnymi bazami danych.


> **Polska wersja i rozwój forka: Arek / Czaku**

> **Projekt bazowy:** OSInt Graph — Copyright (C) 2025-2026 Andrea Cumini  
> andrea@osintinfo.net · https://www.osintinfo.net

## Najważniejsze funkcje

- pełny polski interfejs użytkownika;
- wbudowany polski manual;
- niezależny wybór języka interfejsu;
- niezależny profil **Standard / Polski OSINT**;
- walidacja PESEL, NIP, REGON, KRS i polskiego IBAN;
- skróty do oficjalnych polskich rejestrów publicznych;
- panel **Moje bazy**;
- import CSV, JSON i Graph JSON;
- pomocnicza obsługa SQLite;
- zapisywanie źródła danych przez `source_db`;
- polskie przykłady danych i konfiguracji AI;
- możliwość budowy wersji Windows.

## Profil Polski OSINT

Profil **Polski OSINT** jest opcjonalny i działa niezależnie od języka interfejsu.

Możesz używać:
- polskiego interfejsu + profilu Standard,
- polskiego interfejsu + Polski OSINT,
- angielskiego interfejsu + Polski OSINT.

Wyłączenie profilu nie usuwa danych ze sprawy.

## Moje bazy

Moduł **Moje bazy** pozwala importować własne zbiory danych i tworzyć z nich węzły oraz relacje.

Obsługiwane dane mogą obejmować m.in. osoby, firmy, telefony, e-maile, adresy,
NIP, REGON, KRS, VIN, pojazdy i własne relacje.

Każdy zaimportowany element może zachować informację o źródle przez `source_db`.


## Autor polskiej wersji

Polska wersja, lokalizacja oraz rozszerzenia **PolGraph OSINT**
zostały przygotowane i są rozwijane przez:

**Arek / Czaku**

Zakres prac obejmuje m.in.:

- pełną polską lokalizację interfejsu,
- polski manual i dokumentację,
- profil Polski OSINT,
- obsługę polskich identyfikatorów i rejestrów,
- moduł **Moje bazy**,
- import własnych danych,
- dostosowanie aplikacji do polskich zastosowań OSINT,
- rozwój i utrzymanie forka PolGraph OSINT.

Projekt bazowy: **OSInt Graph by Andrea Cumini**.

## Prywatność

**Nie publikuj w repozytorium:**
- `data/`,
- `fonti/`,
- `chatbot.conf`,
- plików `.db`, `.sqlite`, `.sqlite3`,
- eksportów `*.graph.json`,
- dokumentów źródłowych,
- kluczy API,
- danych osobowych.

Repozytorium zawiera reguły `.gitignore`, które pomagają ograniczyć ryzyko przypadkowego
wysłania takich danych.

## Szybkie uruchomienie

Wymagany Python 3.10+.

```bash
python -m pip install -r requirements.txt
python app.py
```

Aplikacja uruchamia się lokalnie pod adresem:

```text
http://127.0.0.1:5000
```

## Windows

W repozytorium znajdują się:
- `URUCHOM_PL.bat` — uruchomienie ze źródeł;
- `BUILD_WINDOWS_PL.bat` — budowa EXE;
- `IMPORT_MY_DATABASE.bat` — import własnych danych;
- `POLSKIE_REJESTRY.bat` — pomocnik polskich rejestrów.

Ręczna budowa EXE:

```bash
python -m pip install -r requirements.txt -r requirements-build.txt
python build_app.py --noconsole
```

Domyślna nazwa programu:

```text
PolGraphOSINT.exe
```

## Projekt bazowy i licencja

PolGraph OSINT bazuje na projekcie **OSInt Graph** autorstwa **Andrea Cumini**.

Repozytorium bazowe:  
https://github.com/tingon11/OsintGraph

Szczegóły:
- [FORK-NOTICE.md](FORK-NOTICE.md)
- [UPSTREAM.md](UPSTREAM.md)

Oryginalne pliki prawne pozostają zachowane bez zmian:
- [LICENSE](LICENSE)
- [NOTICE](NOTICE)
- [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)

## Dokumentacja

- [English README](README_EN.md)
- [Instrukcja publikacji na GitHub](GITHUB_PUBLISH_PL.md)
- [Historia zmian](CHANGELOG.md)
- [Informacja o forku](FORK-NOTICE.md)
- [Informacja o projekcie bazowym](UPSTREAM.md)

## Wersja

`1.3.4`

---

**PolGraph OSINT — polska wersja narzędzia do analizy grafowej OSINT.**
