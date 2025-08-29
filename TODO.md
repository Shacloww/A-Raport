# TODO — Program do raportów laboratoryjnych (Node.js)

Cel: stworzyć prosty program w Node.js do kompletowania i zapisywania badań laboratoryjnych podzielonych na kroki z kompletem pól wymaganych przez użytkownika.

## Wymagania (jawne)
- Każde badanie ma być podzielone na kroki (lista kroków).
- Dla badania przechowywać:
  - czas rozpoczęcia (timestamp / ISO)
  - czas zakończenia (timestamp / ISO)
  - surowce i ich ilości w gramach (lista obiektów: nazwa, g)
  - czynności / opis (tekst)
  - próżnia w barach (liczba)
  - temperatura płaszcza w °C (liczba)
  - temperatura mieszadła w °C (liczba)
  - obciążenie w Nm (liczba)
  - uwagi (tekst)
  - obserwacje (tekst)

## Wymagania (domyślne / rekomendowane)
- Prosty interfejs CLI do tworzenia / wypisywania / eksportu raportów.
- Raporty przechowywane jako pliki JSON w katalogu `reports/` (jeden plik = jedno badanie) lub w prostym pliku bazy (np. `db.json`).
- Walidacja wejścia (np. liczby, zakresy, obowiązkowe pola).
- Możliwość eksportu do CSV i/lub MD.
- Prosty zestaw testów jednostkowych (happy-path + kilka edge case).

## Model danych (propozycja)
Badanie (Report) — przykładowy JSON:
{
  "id": "uuid",
  "title": "nazwa badania",
  "startTime": "2025-08-29T09:00:00Z",
  "endTime": "2025-08-29T10:15:00Z",
  "steps": [
    {"stepNumber": 1, "description": "Opis kroku", "durationMin": 15}
  ],
  "materials": [
    {"name": "Substancja A", "grams": 12.5}
  ],
  "actions": "Opis czynności",
  "vacuumBar": 0.02,
  "jacketTempC": 40.0,
  "stirrerTempC": 38.5,
  "torqueNm": 1.2,
  "notes": "Uwagi",
  "observations": "Obserwacje",
  "createdAt": "ISO",
  "updatedAt": "ISO"
}

## Minimalny plan implementacji (kroki)
- [ ] Utworzyć projekt Node (package.json) i zainstalować minimalne zależności (commander/inquirer, uuid, jest).
- [ ] Dodać folder `src/` i model `Report` (typy / walidacja).
- [ ] Zaimplementować prosty CLI (`src/cli.js`) z poleceniami: `new`, `list`, `view <id>`, `export <id>`.
- [ ] Zapisywanie raportów do `reports/` jako JSON.
- [ ] Prosty eksport do Markdown i/lub CSV.
- [ ] Dodać testy jednostkowe dla serializacji i walidacji.
- [ ] Dodać README z instrukcją użycia.

## Kryteria akceptacji (Done)
- Można dodać nowe badanie z wszystkimi wymaganymi polami przez CLI.
- Raport jest zapisany i można go wyświetlić (`view`) i wyeksportować (`export`).
- Podstawowa walidacja działa (liczby tam gdzie trzeba, daty w poprawnym formacie).

## Edge-cases do rozważenia
- Brak czasu zakończenia (badanie w toku).
- Ujemne lub nierealistyczne wartości (np. -1000 °C) — reguły walidacji.
- Duża liczba surowców/duże pliki — rozważ chunking/streaming przy eksporcie.

## Następne kroki (krótkoterminowe)
1. Zainicjować repo i `package.json`.
2. Utworzyć strukturę katalogów (`src/`, `reports/`, `tests/`).
3. Implementować model i CLI (komenda `new` najpierw).

---
Plik ten jest punktem startowym — jeśli chcesz, mogę od razu utworzyć projekt Node, dodać `package.json` i zacząć implementować CLI (`new`), albo najpierw doprecyzować format wyjściowy (JSON/CSV/MD).
