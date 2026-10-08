# Changelog

## [1.3.3-pl.1] - 2026-10-08

### Publication-ready fork
- renamed public modified distribution to **PolGraph OSINT**;
- replaced upstream application wordmark/icon with independent fork artwork;
- preserved upstream author attribution and legal files;
- removed bundled `data/osintgraph.db` from the publishable source tree;
- added GitHub repository documentation and workflows;
- strengthened `.gitignore` for case data, SQLite databases, secrets and exports.

### Polish localization
- complete Polish i18n key coverage;
- Polish built-in manual;
- Polish README and add-on documentation;
- independent language selection and `Standard / Polski OSINT` profile.

### Polish OSINT additions
- PESEL, NIP, REGON and IBAN PL validation helpers;
- Polish register shortcuts;
- `Moje bazy` import panel;
- CSV / JSON / Graph JSON import workflow;
- SQLite conversion helper;
- `source_db` provenance field.

## Earlier development versions
Internal development builds 1.0–1.3.3 introduced the Polish localization and
Polish OSINT extensions before the public-fork packaging.
