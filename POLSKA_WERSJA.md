# PolGraph OSINT PL 1.3.2 — FULL NATIVE PL

Ta wersja naprawia system lokalizacji natywnie w `static/i18n.js`.

Najważniejsza zmiana: wcześniejsza wersja miała polskie 379 kluczy bazowych, ale brakowało 218+ kluczy dodawanych później przez `Object.assign(I18N.en/it/...)`. W efekcie brakujący polski tekst spadał do włoskiego.

W 1.3.2 dodano polskie odpowiedniki dla rozszerzeń: Sprawy, AI, konfiguracja AI, import CSV/Excel, edycja relacji, edycja wartości węzła, style połączeń, OCR, licencje i inne elementy dynamiczne.

Usunięto warstwę `pl_runtime_full_fix.js`, ponieważ nie jest już potrzebna.

Projekt bazowy i jego licencja pozostają bez zmian.
