# PolGraph OSINT — dodatki polskiej wersji

## Polski OSINT
Profil Polski OSINT jest opcjonalny i niezależny od języka GUI.

Dodaje:
- PESEL,
- NIP,
- REGON,
- KRS,
- IBAN PL,
- polskie typy danych i relacje,
- skróty do oficjalnych rejestrów.

## Polskie źródła publiczne
- KRS / Wyszukiwarka KRS,
- Portal Rejestrów Sądowych,
- CEIDG,
- Wykaz podatników VAT,
- REGON / GUS,
- BIP.

## Moje bazy
Obsługiwane w GUI:
- CSV,
- JSON,
- Graph JSON.

SQLite może być konwertowane przez:
- `pl/my_databases_importer.py`,
- `IMPORT_MY_DATABASE.bat`.

Pole `source_db` służy do zapisywania pochodzenia danych.

## Import i deduplikacja
Importowane zbiory powinny mieć stabilne identyfikatory. Deduplikacja pomaga ograniczyć powtórzenia,
ale wymaga kontroli analityka.

## Bezpieczeństwo
Nie publikuj:
- `data/`,
- `fonti/`,
- `chatbot.conf`,
- baz SQLite,
- danych osobowych,
- materiałów spraw,
- kluczy API.

## Windows
- `URUCHOM_PL.bat`
- `BUILD_WINDOWS_PL.bat`
- `PolGraphOSINT.exe`

## Autor polskiej wersji
Polska lokalizacja, rozszerzenia Polski OSINT i rozwój forka:

**Arek / Czaku**

Projekt bazowy:

**OSInt Graph by Andrea Cumini**
