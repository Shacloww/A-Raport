#!/usr/bin/env node
const { program } = require('commander');
const inquirer = require('inquirer');
const store = require('./reportStore');

program
  .name('a-raport')
  .description('Prosty CLI do tworzenia raportów laboratoryjnych')
  .version('0.1.0');

program.command('new').description('Utwórz nowe badanie').action(async () => {
  const base = await inquirer.prompt([
    { name: 'title', message: 'Nazwa badania', type: 'input' }
  ]);

  const steps = [];
  let stepNumber = 1;
  while (true) {
    const { add } = await inquirer.prompt([{ name: 'add', message: 'Dodać krok?', type: 'confirm', default: false }]);
    if (!add) break;

    const sBase = await inquirer.prompt([
      { name: 'startTime', message: `Czas rozpoczęcia kroku ${stepNumber} (ISO, opcjonalnie)`, type: 'input' },
      { name: 'endTime', message: `Czas zakończenia kroku ${stepNumber} (ISO, opcjonalnie)`, type: 'input' },
      { name: 'description', message: `Opis kroku ${stepNumber}`, type: 'input' },
      { name: 'durationMin', message: 'Czas trwania (min)', type: 'input' },
      { name: 'actions', message: 'Czynności / opis', type: 'editor' },
      { name: 'vacuumBar', message: 'Próżnia (bar)', type: 'input' },
      { name: 'jacketTempC', message: 'Temperatura płaszcza (°C)', type: 'input' },
      { name: 'stirrerTempC', message: 'Temperatura mieszadła (°C)', type: 'input' },
      { name: 'torqueNm', message: 'Obciążenie (Nm)', type: 'input' },
      { name: 'notes', message: 'Uwagi (krok)', type: 'input' },
      { name: 'observations', message: 'Obserwacje (krok)', type: 'editor' }
    ]);

    // materials per step
    const materials = [];
    while (true) {
      const { addm } = await inquirer.prompt([{ name: 'addm', message: 'Dodać surowiec do tego kroku?', type: 'confirm', default: false }]);
      if (!addm) break;
      const m = await inquirer.prompt([
        { name: 'name', message: 'Nazwa surowca', type: 'input' },
        { name: 'grams', message: 'Ilość (g)', type: 'input' }
      ]);
      materials.push({ name: m.name, grams: Number(m.grams) });
    }

    steps.push({
      stepNumber,
      startTime: sBase.startTime || null,
      endTime: sBase.endTime || null,
  description: sBase.description,
  durationMin: (sBase.startTime && sBase.endTime) ? (Math.round((Date.parse(sBase.endTime) - Date.parse(sBase.startTime)) / 60000)) : (sBase.durationMin ? Number(sBase.durationMin) : null),
      materials,
      actions: sBase.actions,
      vacuumBar: sBase.vacuumBar ? Number(sBase.vacuumBar) : null,
      jacketTempC: sBase.jacketTempC ? Number(sBase.jacketTempC) : null,
      stirrerTempC: sBase.stirrerTempC ? Number(sBase.stirrerTempC) : null,
      torqueNm: sBase.torqueNm ? Number(sBase.torqueNm) : null,
      notes: sBase.notes,
      observations: sBase.observations
    });

    stepNumber++;
  }

  const now = new Date().toISOString();
  const report = {
  title: base.title,
  steps
  };

  const saved = await store.createReport(report);
  console.log('Saved report with id:', saved.id);
});

program.command('list').description('Wyświetl listę raportów').action(async () => {
  const rows = await store.listReports();
  if (!rows.length) {
    console.log('Brak raportów.');
    return;
  }
  for (const r of rows) {
    console.log(`${r.id} — ${r.title} — ${r.startTime || ''}`);
  }
});

program.command('view <id>').description('Pokaż raport JSON dla id').action(async (id) => {
  try {
    const r = await store.getReport(id);
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.error('Nie mogę załadować raportu:', e.message);
  }
});

program.command('export-md <id>').description('Eksportuj raport do Markdown').action(async (id) => {
  try {
    const mdPath = await store.exportReportMarkdown(id);
    console.log('Zapisano MD:', mdPath);
  } catch (e) {
    console.error('Błąd eksportu:', e.message);
  }
});

program.parse(process.argv);
