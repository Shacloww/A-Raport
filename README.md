# A-Raport

Prosty CLI do tworzenia raportów laboratoryjnych.

Instalacja:

```bash
npm install
```

Użycie:

```bash

node src/cli.js new       # interaktywnie utwórz nowe badanie (czasy i pomiary per-krok)
node src/cli.js list      # lista raportów
node src/cli.js view <id> # wyświetl JSON raportu
node src/cli.js export-md <id> # eksport do Markdown
```

Raporty są zapisywane w katalogu `reports/` jako pliki JSON (oraz eksportowane jako .md).
