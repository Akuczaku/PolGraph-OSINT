# Moje bazy — przykłady

Obsługa bezpośrednia w GUI: CSV, JSON, Graph JSON.

Dla SQLite użyj `my_databases_importer.py`, np.:

`python pl/my_databases_importer.py moja.db --sqlite-query "SELECT full_name AS label, phone AS telefon, company AS firma, nip FROM contacts" --source-name "Kontakty" --output kontakty.graph.json`
