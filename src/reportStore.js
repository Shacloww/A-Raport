const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');

async function ensureReportsDir() {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

function sanitizeReport(r) {
  return Object.assign({}, r);
}

async function createReport(report) {
  await ensureReportsDir();
  // generate id from created date + slug(title) to be deterministic
  function slug(s) {
    if (!s) return '';
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0,40);
  }
  const now = new Date().toISOString();
  let id = report.id;
  if (!id) {
    const base = slug(report.title) || uuidv4().slice(0,8);
    const datePart = now.slice(0,10).replace(/-/g, '');
    id = `${datePart}-${base}`;
    // ensure unique
    let i = 1;
    while (true) {
      const filePath = path.join(REPORTS_DIR, `${id}.json`);
      try {
        await fs.access(filePath);
        // exists, bump
        id = `${datePart}-${base}-${i++}`;
      } catch (e) {
        break;
      }
    }
  }
  // preserve createdAt when overwriting existing report
  let createdAt = now;
  const filePath = path.join(REPORTS_DIR, `${id}.json`);
  try {
    const existing = await fs.readFile(filePath, 'utf8');
    const obj = JSON.parse(existing);
    if (obj && obj.createdAt) createdAt = obj.createdAt;
  } catch (e) {
    // ignore missing
  }
  const toSave = Object.assign({ id, createdAt: createdAt, updatedAt: now }, report);
  await fs.writeFile(filePath, JSON.stringify(sanitizeReport(toSave), null, 2), 'utf8');
  return toSave;
}

async function listReports() {
  await ensureReportsDir();
  const files = await fs.readdir(REPORTS_DIR);
  const reports = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const content = await fs.readFile(path.join(REPORTS_DIR, f), 'utf8');
      const obj = JSON.parse(content);
  // use createdAt date for listing date column
  const listDate = obj.createdAt ? obj.createdAt.slice(0,10) : '';
  reports.push({ id: obj.id, title: obj.title || '(no title)', listDate, updatedAt: obj.updatedAt || '' });
    } catch (e) {
      // ignore broken files
    }
  }
  return reports;
}

async function getReport(id) {
  const filePath = path.join(REPORTS_DIR, `${id}.json`);
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function exportReportMarkdown(id) {
  const r = await getReport(id);
  const lines = [];
  lines.push(`# Report: ${r.title || r.id}`);
  lines.push('');
  lines.push(`- id: ${r.id}`);
  lines.push(`- startTime: ${r.startTime || ''}`);
  lines.push(`- endTime: ${r.endTime || ''}`);
  lines.push('');
  // If report has steps, render each step with its own fields (avoid duplicating global fields)
  if (Array.isArray(r.steps) && r.steps.length) {
    lines.push('## Steps');
    for (const s of r.steps) {
      lines.push(`### Krok ${s.stepNumber || ''}`);
      lines.push('');
      if (s.startTime || s.endTime) lines.push(`- czas: ${s.startTime || ''} — ${s.endTime || ''}`);
      if (s.description) lines.push(`- opis: ${s.description}`);
      if (s.durationMin != null) lines.push(`- czas trwania (min): ${s.durationMin}`);
      if (Array.isArray(s.materials) && s.materials.length) {
        lines.push('- surowce:');
        for (const m of s.materials) {
          lines.push(`  - ${m.name}: ${m.grams} g`);
        }
      }
      lines.push('- pomiary:');
      lines.push(`  - próżnia (bar): ${s.vacuumBar != null ? s.vacuumBar : ''}`);
      lines.push(`  - temp płaszcza (°C): ${s.jacketTempC != null ? s.jacketTempC : ''}`);
      lines.push(`  - temp mieszadła (°C): ${s.stirrerTempC != null ? s.stirrerTempC : ''}`);
      lines.push(`  - obciążenie (Nm): ${s.torqueNm != null ? s.torqueNm : ''}`);
      if (s.actions) { lines.push(`- czynności: ${s.actions}`); }
      if (s.notes) { lines.push(`- uwagi: ${s.notes}`); }
      if (s.observations) { lines.push(`- obserwacje: ${s.observations}`); }
      lines.push('');
    }
  } else {
    // fallback: render top-level materials and measurements if there are no steps
    if (Array.isArray(r.materials) && r.materials.length) {
      lines.push('## Materials');
      for (const m of r.materials) {
        lines.push(`- ${m.name}: ${m.grams} g`);
      }
      lines.push('');
    }
    lines.push('## Measurements');
    lines.push(`- Vacuum (bar): ${r.vacuumBar || ''}`);
    lines.push(`- Jacket temp (°C): ${r.jacketTempC || ''}`);
    lines.push(`- Stirrer temp (°C): ${r.stirrerTempC || ''}`);
    lines.push(`- Torque (Nm): ${r.torqueNm || ''}`);
    lines.push('');
    lines.push('## Actions');
    lines.push(r.actions || '');
    lines.push('');
    lines.push('## Notes');
    lines.push(r.notes || '');
    lines.push('');
    lines.push('## Observations');
    lines.push(r.observations || '');
    lines.push('');
  }

  await ensureReportsDir();
  const mdPath = path.join(REPORTS_DIR, `${r.id}.md`);
  await fs.writeFile(mdPath, lines.join('\n'), 'utf8');
  return mdPath;
}

  async function exportReportXlsx(id) {
    // lazy require to avoid loading in non-electron CLI contexts
    const xlsx = require('xlsx');
    const r = await getReport(id);
    // Arkusz 1: Metadane (po polsku)
    const meta = [
      ['Id', r.id],
      ['Tytuł', r.title || ''],
      ['Utworzono', r.createdAt || ''],
      ['Zaktualizowano', r.updatedAt || '']
    ];

    // Sheet2: steps (one row per material per step)

    const rows = [];
    // Nagłówki po polsku: LP, Start, Koniec, Czas trwania (min), Surowce, Opis, Czynności, Próżnia (bar), Temp. płaszcza (°C), Temp. mieszadła (°C), Obciążenie (Nm), Uwagi, Obserwacje
    rows.push(['LP', 'Start', 'Koniec', 'Czas trwania (min)', 'Surowce', 'Opis', 'Czynności', 'Próżnia (bar)', 'Temp. płaszcza (°C)', 'Temp. mieszadła (°C)', 'Obciążenie (Nm)', 'Uwagi', 'Obserwacje']);
    if (Array.isArray(r.steps) && r.steps.length) {
      for (let i = 0; i < r.steps.length; i++) {
        const s = r.steps[i];
        const lp = i + 1;
        const start = s.startTime || '';
        const end = s.endTime || '';
        const duration = s.durationMin != null ? s.durationMin : '';
        // combine materials into a readable single cell: "name (g g); name2 (g g)"
        let matText = '';
        if (Array.isArray(s.materials) && s.materials.length) {
          matText = s.materials.map(m => {
            const grams = (m.grams !== undefined && m.grams !== null && m.grams !== '') ? `${m.grams} g` : '';
            return m.name ? (m.name + (grams ? ` (${grams})` : '')) : (grams || '');
          }).filter(Boolean).join('; ');
        }
        const description = s.description || '';
        const actions = s.actions || '';
        const vacuumBar = s.vacuumBar != null ? s.vacuumBar : '';
        const jacketTempC = s.jacketTempC != null ? s.jacketTempC : '';
        const stirrerTempC = s.stirrerTempC != null ? s.stirrerTempC : '';
        const torqueNm = s.torqueNm != null ? s.torqueNm : '';
        const notes = s.notes || '';
        const observations = s.observations || '';
        rows.push([lp, start, end, duration, matText, description, actions, vacuumBar, jacketTempC, stirrerTempC, torqueNm, notes, observations]);
      }
    }

    const wb = xlsx.utils.book_new();
    const wsMeta = xlsx.utils.aoa_to_sheet(meta);
    xlsx.utils.book_append_sheet(wb, wsMeta, 'Metadane');
    const wsSteps = xlsx.utils.aoa_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, wsSteps, 'Kroki');

    await ensureReportsDir();
    const outPath = path.join(REPORTS_DIR, `${r.id}.xlsx`);
    xlsx.writeFile(wb, outPath);
    return outPath;
  }

  async function deleteReport(id) {
    await ensureReportsDir();
    const jsonPath = path.join(REPORTS_DIR, `${id}.json`);
    const mdPath = path.join(REPORTS_DIR, `${id}.md`);
    const xlsxPath = path.join(REPORTS_DIR, `${id}.xlsx`);
    const removed = [];
    for (const p of [jsonPath, mdPath, xlsxPath]) {
      try {
        await fs.unlink(p);
        removed.push(p);
      } catch (e) {
        // ignore missing
      }
    }
    return { removed };
  }

module.exports = {
  createReport,
  listReports,
  getReport,
  exportReportMarkdown,
  exportReportXlsx,
  deleteReport
};




