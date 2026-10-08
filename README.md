<p align="center">
  <img src="static/logo.svg" alt="PolGraph OSINT" width="520">
</p>

# PolGraph OSINT

**PolGraph OSINT** is an independent modified fork of
[OSInt Graph](https://github.com/tingon11/OsintGraph) by **Andrea Cumini**.

The fork keeps the original graph-analysis workflow and adds a complete Polish
localization, a Polish user manual and optional Polish OSINT helpers while
keeping language selection independent from the `Standard / Polski OSINT`
profile.

> **Upstream attribution:** OSInt Graph — Copyright (C) 2025-2026 Andrea Cumini  
> andrea@osintinfo.net · https://www.osintinfo.net

## What this fork adds

- complete Polish (`pl`) UI localization;
- Polish built-in manual and Polish documentation;
- optional **Polski OSINT** profile, independent from the UI language;
- PESEL, NIP, REGON and Polish IBAN validation helpers;
- Polish public-register shortcuts;
- **Moje bazy** panel for importing your own data;
- CSV / JSON / Graph JSON support in the GUI;
- SQLite → Graph JSON helper;
- source tracking through `source_db`;
- Polish CSV examples and AI configuration example;
- a **new name and new logo**, as required by the upstream `NOTICE`.

## Privacy

Cases and imported investigative data are local. **Do not commit case databases,
documents, API keys or exported datasets to GitHub.** The repository `.gitignore`
excludes `data/`, `fonti/`, `chatbot.conf`, SQLite databases, Graph JSON exports
and common secret/config files.

## Quick start

Python 3.10+:

```bash
python -m pip install -r requirements.txt
python app.py
```

The application starts locally on `http://127.0.0.1:5000`.

### Windows

Convenience scripts are included:

- `URUCHOM_PL.bat` — run from source;
- `BUILD_WINDOWS_PL.bat` — build the Windows executable;
- `IMPORT_MY_DATABASE.bat` — convert/import your own datasets;
- `POLSKIE_REJESTRY.bat` — Polish register helper.

Manual build:

```bash
python -m pip install -r requirements.txt -r requirements-build.txt
python build_app.py --noconsole
```

Default executable name: `PolGraphOSINT.exe`.

## Repository structure

| Path | Purpose |
|---|---|
| `app.py` | Flask application / API |
| `store.py` | local SQLite case storage |
| `sources.py` | document extraction and OCR |
| `ontology.py`, `ontology_i18n.py` | graph ontology |
| `templates/`, `static/` | browser GUI |
| `static/manual/` | built-in multilingual manual |
| `pl/` | Polish OSINT profile and import helpers |
| `esempi/` | safe example imports |
| `.github/workflows/` | CI and Windows build workflow |

## Upstream and modifications

See [FORK-NOTICE.md](FORK-NOTICE.md) and [UPSTREAM.md](UPSTREAM.md).

This repository intentionally keeps the original upstream legal files
**unchanged**:

- [LICENSE](LICENSE)
- [NOTICE](NOTICE)
- [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)

The upstream `NOTICE` requires modified public distributions to use a different
name and logo. This fork therefore uses the name **PolGraph OSINT** and independent
artwork.

## Security / responsible use

Do not post real personal data, case databases, source documents, credentials or
API keys in GitHub Issues. See [SECURITY.md](SECURITY.md).

## Version

`1.3.3-pl.1`

See [CHANGELOG.md](CHANGELOG.md).
