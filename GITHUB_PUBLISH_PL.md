# Publikacja PolGraph OSINT przez GitHub Desktop

## 1. Utwórz fork

1. Otwórz w przeglądarce: `https://github.com/tingon11/OsintGraph`
2. Kliknij **Fork**.
3. Po utworzeniu forka zmień jego nazwę w `Settings → General → Repository name`
   na np. `PolGraph-OSINT`.
4. Nie zmieniaj ani nie usuwaj `LICENSE`, `NOTICE` i `THIRD-PARTY-NOTICES.md`.

## 2. Sklonuj fork przez GitHub Desktop

1. GitHub Desktop → **File → Clone repository**.
2. Wybierz swój fork `PolGraph-OSINT`.
3. Wybierz pusty katalog lokalny.
4. Kliknij **Clone**.

## 3. Wgraj tę przygotowaną wersję

Skopiuj zawartość tego katalogu do sklonowanego repozytorium.

Nie kopiuj własnych danych spraw. Przed commitem sprawdź, że nie ma:
`data/`, `fonti/`, `chatbot.conf`, `*.db`, `*.sqlite`, `*.graph.json`.

## 4. Commit

W GitHub Desktop:

- Summary: `PolGraph OSINT 1.3.3-pl.1 - Polish fork release`
- Description:
  `Complete Polish localization, Polish manual, Polish OSINT profile, custom database import and publication-safe fork branding.`

Kliknij **Commit to main**, a następnie **Push origin**.

## 5. Sprawdź GitHub Actions

Po wysłaniu kodu zakładka **Actions** powinna uruchomić kontrolę repozytorium.
Workflow sprawdza składnię Python i podstawowe wymagania publikacyjne.

## 6. Release

Na GitHub:
1. **Releases → Draft a new release**
2. Tag: `v1.3.3-pl.1`
3. Title: `PolGraph OSINT 1.3.3-pl.1`
4. Wklej treść z `RELEASE_NOTES_v1.3.3-pl.1.md`.
5. Dołącz gotowy ZIP/EXE, jeżeli chcesz publikować binaria.
6. Opublikuj release.

## 7. Sugerowane dane repozytorium

**Description:**  
`Polish-focused OSINT graph analysis fork with full PL localization, optional Polish OSINT profile and local data workflows.`

**Topics:**  
`osint`, `graph-analysis`, `cytoscape`, `flask`, `poland`, `investigation`,
`data-visualization`, `sqlite`, `python`

## 8. Synchronizacja z oryginałem

Dodaj upstream w terminalu repozytorium:

```text
git remote add upstream https://github.com/tingon11/OsintGraph.git
git fetch upstream
```

Przed scaleniem aktualizacji przeczytaj `UPSTREAM.md`.
