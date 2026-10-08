# PolGraph OSINT — instrukcja projektu GitHub

**PolGraph OSINT** to niezależna zmodyfikowana wersja projektu
**OSInt Graph** autorstwa Andrea Cumini.

Oryginał: https://github.com/tingon11/OsintGraph

## Najważniejsze rozszerzenia

- pełny interfejs polski;
- polski manual;
- profil `Standard / Polski OSINT`;
- walidatory PESEL, NIP, REGON i IBAN PL;
- pomoc do polskich rejestrów publicznych;
- moduł `Moje bazy`;
- import CSV / JSON / Graph JSON;
- konwersja SQLite do Graph JSON;
- zapisywanie źródła danych `source_db`.

## Ważne przed publikacją

Oryginalny `NOTICE` wymaga dla wersji zmodyfikowanej **innej nazwy i logo**.
Dlatego publiczny fork używa nazwy **PolGraph OSINT** i nowej grafiki.

Atrybucja autora oryginału pozostaje w interfejsie i dokumentacji.

## Dane prywatne

Nigdy nie wysyłaj do repozytorium:

- `data/`,
- `fonti/`,
- `chatbot.conf`,
- baz `.db`, `.sqlite`, `.sqlite3`,
- plików eksportowanych `*.graph.json`,
- prawdziwych materiałów spraw.

## Uruchomienie

```text
python -m pip install -r requirements.txt
python app.py
```

## Budowa EXE

```text
python -m pip install -r requirements.txt -r requirements-build.txt
python build_app.py --noconsole
```

Powstaje domyślnie `PolGraphOSINT.exe`.

Szczegółowa instrukcja publikacji przez GitHub Desktop znajduje się w
[GITHUB_PUBLISH_PL.md](GITHUB_PUBLISH_PL.md).
