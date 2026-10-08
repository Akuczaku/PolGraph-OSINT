# Dodatki polskiej wersji

## Polski OSINT

Profil można włączać niezależnie od języka aplikacji. Włączenie profilu odsłania polskie funkcje i skróty, a jego wyłączenie nie usuwa danych ze sprawy.

### Obsługiwane identyfikatory

- PESEL,
- NIP,
- REGON 9 i 14 cyfr,
- KRS,
- polski IBAN.

### Oficjalne źródła

Profil zawiera skróty do oficjalnych serwisów publicznych, m.in. KRS/PRS, CEIDG, wykazu podatników VAT, REGON/GUS i BIP. Aplikacja nie omija CAPTCHA, logowania ani innych zabezpieczeń.

## Moje bazy

Panel umożliwia dodawanie własnych danych do grafu.

Obsługa w GUI:
- CSV,
- JSON,
- Graph JSON.

SQLite można przekształcić do Graph JSON przez `pl/my_databases_importer.py` lub `IMPORT_MY_DATABASE.bat`.

### Pochodzenie danych

Importowane węzły i relacje otrzymują pole `source_db`, dzięki któremu można ustalić, z której bazy pochodzi element.

### Deduplikacja

Importer próbuje zapobiegać wielokrotnemu dodawaniu elementów o tym samym identyfikatorze. Przed dużym importem warto wykonać kopię folderu `data/`.

## Ikona 3D

Folder `branding/` zawiera opis i miejsce na własną ikonę 3D. Własny plik `icon_3d.ico` można wykorzystać w buildzie Windows jako ikonę EXE, okna i skrótu.
