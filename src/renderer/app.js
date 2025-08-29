// ...existing code...
(function () {
  const e = React.createElement;
  const { useState, useEffect } = React;
  const root = document.getElementById('root');

  function emptyMaterial() {
    return { name: '', grams: '' };
  }

  function emptyStep(num) {
    return {
      stepNumber: num,
      // store times as HH:MM only
      startTime: '00:00',
      endTime: '00:00',
      materials: [emptyMaterial()],
      description: '',
      durationMin: '',
      actions: '',
      vacuumBar: '',
      jacketTempC: '',
      stirrerTempC: '',
      torqueNm: '',
      notes: '',
      observations: ''
    };
  }

  function timeFromIso(iso) {
    if (!iso) return '';
    // accept either HH:MM or an ISO-like string; prefer first 5 chars
    try {
      return String(iso).slice(0,5);
    } catch (e) { return ''; }
  }

  function App() {
    const DRAFT_KEY = 'a-raport:draft';
    const [reports, setReports] = useState([]);
    const [selected, setSelected] = useState(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
      title: '',
      steps: [emptyStep(1)]
    });

    // restore draft on mount
    useEffect(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') setForm(parsed);
        }
      } catch (e) {
        // ignore
      }
    }, []);

    // autosave draft on form change
    useEffect(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch (e) {
        // ignore
      }
    }, [form]);


    useEffect(() => {
      refresh();
    }, []);

    async function refresh() {
      const r = await window.api.listReports();
      setReports(r);
    }

    async function loadReport(id) {
      // load and show summary (do not start editing)
      const rep = await window.api.getReport(id);
      setSelected(rep);
      setCreating(false);
    }

    function startEdit() {
      if (!selected) return;
      // populate form with selected report so user can edit and save
      const rep = selected;
      setForm({
        // keep id so createReport will overwrite
        id: rep.id,
        title: rep.title || '',
        steps: Array.isArray(rep.steps) && rep.steps.length ? rep.steps : [emptyStep(1)]
      });
      setCreating(true);
      setSelected(null);
    }

    function updateField(key, value) {
      setForm(Object.assign({}, form, { [key]: value }));
    }

    // materialy i operacje na nich są teraz wewnątrz kroku
    function updateMaterial(stepIdx, matIdx, key, value) {
      const steps = form.steps.slice();
      const mats = (steps[stepIdx].materials || []).slice();
      mats[matIdx] = Object.assign({}, mats[matIdx], { [key]: value });
      steps[stepIdx] = Object.assign({}, steps[stepIdx], { materials: mats });
      setForm(Object.assign({}, form, { steps }));
    }

    function addMaterialToStep(stepIdx) {
      const steps = form.steps.slice();
      const mats = (steps[stepIdx].materials || []).concat([emptyMaterial()]);
      steps[stepIdx] = Object.assign({}, steps[stepIdx], { materials: mats });
      setForm(Object.assign({}, form, { steps }));
    }

    function removeMaterialFromStep(stepIdx, matIdx) {
      const steps = form.steps.slice();
      const mats = (steps[stepIdx].materials || []).slice();
      mats.splice(matIdx, 1);
      steps[stepIdx] = Object.assign({}, steps[stepIdx], { materials: mats.length ? mats : [emptyMaterial()] });
      setForm(Object.assign({}, form, { steps }));
    }

    function updateStep(idx, key, value) {
      const s = form.steps.slice();
      s[idx] = Object.assign({}, s[idx], { [key]: value });
      // jeśli zmieniono startTime lub endTime, przelicz czas trwania w minutach
      if (key === 'startTime' || key === 'endTime') {
        function toMinutes(hhmm) {
          if (!hhmm) return NaN;
          const parts = String(hhmm).split(':');
          if (parts.length < 2) return NaN;
          const h = Number(parts[0]);
          const m = Number(parts[1]);
          if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
          return h * 60 + m;
        }
        const st = toMinutes(s[idx].startTime);
        const en = toMinutes(s[idx].endTime);
        if (!Number.isNaN(st) && !Number.isNaN(en)) {
          let mins = en - st;
          if (mins < 0) mins += 24 * 60; // wrap over midnight
          s[idx].durationMin = String(mins);
        } else {
          s[idx].durationMin = '';
        }
      }
      setForm(Object.assign({}, form, { steps: s }));
    }

    function addStep() {
      const next = (form.steps.length ? form.steps[form.steps.length - 1].stepNumber + 1 : 1);
      setForm(Object.assign({}, form, { steps: form.steps.concat([emptyStep(next)]) }));
    }

    function removeStep(idx) {
      const s = form.steps.slice();
      s.splice(idx, 1);
      // re-number
      for (let i = 0; i < s.length; i++) s[i].stepNumber = i + 1;
      setForm(Object.assign({}, form, { steps: s.length ? s : [emptyStep(1)] }));
    }

    function asNumberOrNull(v) {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }

    async function doCreate(eve) {
      eve.preventDefault();
      const toSave = Object.assign({}, form.id ? { id: form.id } : {}, {
        title: form.title,
        steps: form.steps.map(s => ({
          stepNumber: s.stepNumber,
          startTime: s.startTime || null,
          endTime: s.endTime || null,
          description: s.description,
          durationMin: asNumberOrNull(s.durationMin),
          materials: (s.materials || []).filter(m => m.name).map(m => ({ name: m.name, grams: asNumberOrNull(m.grams) })),
          actions: s.actions,
          vacuumBar: asNumberOrNull(s.vacuumBar),
          jacketTempC: asNumberOrNull(s.jacketTempC),
          stirrerTempC: asNumberOrNull(s.stirrerTempC),
          torqueNm: asNumberOrNull(s.torqueNm),
          notes: s.notes,
          observations: s.observations
        }))
    });
  const saved = await window.api.createReport(toSave);
  await refresh();
  // clear draft after successful save
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  setForm({ title: '', steps: [emptyStep(1)] });
      setSelected(saved);
      setCreating(false);
    }

    async function doExport(id) {
      const p = await window.api.exportMd(id);
      alert('Eksportowano do: ' + p);
    }

    async function doExportXlsx(id) {
      const p = await window.api.exportXlsx(id);
      alert('Eksportowano do: ' + p);
    }

    async function doDelete(id) {
      try {
        const res = await window.api.deleteReport(id);
        // res should contain removed paths
        if (res && res.removed && res.removed.length) {
          alert('Usunięto pliki:\n' + res.removed.join('\n'));
        } else {
          alert('Usunięto raport (brak dodatkowych plików)');
        }
        await refresh();
        setSelected(null);
      } catch (err) {
        console.error('delete failed', err);
        alert('Usuwanie nie powiodło się: ' + (err && err.message ? err.message : String(err)));
      }
    }

    return e('div', { className: 'container' },
      e('header', null, e('h1', null, 'A-Raport — GUI')),
      e('div', { className: 'pane' },
        e('div', { className: 'left' },
          e('div', { className: 'controls' },
              e('button', { onClick: refresh }, 'Odśwież'),
              e('button', { onClick: () => { setCreating(true); setSelected(null); } }, 'Nowy raport')
            ),
          e('ul', null,
            reports.map(r => e('li', { key: r.id },
              e('a', { href: '#', onClick: (ev) => { ev.preventDefault(); loadReport(r.id); } }, r.title || r.id),
              e('div', { className: 'meta' }, `${r.listDate || ''} ${r.updatedAt ? (' ' + (new Date(r.updatedAt).toTimeString().slice(0,5))) : ''}`)
            ))
          )
        ),
        e('div', { className: 'right' },
          creating ? e('form', { onSubmit: doCreate, className: 'report-form' },
            e('div', { className: 'row' },
              e('label', null, 'Tytuł'),
              e('input', { value: form.title, onChange: (e) => updateField('title', e.target.value), required: true })
            ),
            // draft jest automatycznie przywracany przy starcie; brak ręcznych przycisków
            // start/end per-step only (removed top-level startTime/endTime)
            e('fieldset', null, e('legend', null, 'Kroki'),
              form.steps.map((s, idx) => e('div', { className: 'step-block', key: idx },
                e('h4', null, `Krok ${s.stepNumber}`),
                e('div', { className: 'row time-row' },
                  e('label', null, 'Start'),
                  e('input', { type: 'time', step: '60', value: s.startTime ? timeFromIso(s.startTime) : '00:00', onChange: (e) => {
                    const val = e.target.value; // HH:MM
                    updateStep(idx, 'startTime', val ? val.slice(0,5) : '');
                  } }),
                  e('label', null, 'End'),
                  e('input', { type: 'time', step: '60', value: s.endTime ? timeFromIso(s.endTime) : '00:00', onChange: (e) => {
                    const val = e.target.value; // HH:MM
                    updateStep(idx, 'endTime', val ? val.slice(0,5) : '');
                  } }),
                  // duration displayed immediately under End
                  e('div', { className: 'duration-inline' },
                    e('label', { style: { marginLeft: '8px' } }, 'Czas trwania (min)'),
                    e('div', { className: 'summary', style: { marginLeft: '8px' } }, s.durationMin ? `${s.durationMin} min` : '—')
                  )
                ),
                e('fieldset', null, e('legend', null, 'Surowce (krok)'),
                  (s.materials || []).map((m, mi) => e('div', { className: 'material', key: mi },
                    e('input', { placeholder: 'Nazwa', value: m.name, onChange: (e) => updateMaterial(idx, mi, 'name', e.target.value) }),
                    e('input', { placeholder: 'g', value: m.grams, onChange: (e) => updateMaterial(idx, mi, 'grams', e.target.value) }),
                    e('button', { type: 'button', onClick: () => removeMaterialFromStep(idx, mi) }, 'Usuń')
                  )),
                  e('button', { type: 'button', onClick: () => addMaterialToStep(idx) }, 'Dodaj surowiec do kroku')
                ),
                e('div', { className: 'row' },
                  e('label', null, 'Opis kroku'),
                  e('input', { placeholder: 'Opis', value: s.description, onChange: (e) => updateStep(idx, 'description', e.target.value) })
                ),
                // duration now shown inline under End
                e('div', { className: 'row' },
                  e('label', null, 'Czynności / opis'),
                  e('textarea', { value: s.actions, onChange: (e) => updateStep(idx, 'actions', e.target.value) })
                ),
                e('div', { className: 'row numeric-row' },
                  e('label', null, 'Próżnia (bar)'),
                  e('input', { value: s.vacuumBar, onChange: (e) => updateStep(idx, 'vacuumBar', e.target.value) }),
                  e('label', null, 'Temp płaszcza (°C)'),
                  e('input', { value: s.jacketTempC, onChange: (e) => updateStep(idx, 'jacketTempC', e.target.value) })
                ),
                e('div', { className: 'row numeric-row' },
                  e('label', null, 'Temp mieszadła (°C)'),
                  e('input', { value: s.stirrerTempC, onChange: (e) => updateStep(idx, 'stirrerTempC', e.target.value) }),
                  e('label', null, 'Obciążenie (Nm)'),
                  e('input', { value: s.torqueNm, onChange: (e) => updateStep(idx, 'torqueNm', e.target.value) })
                ),
                e('div', { className: 'row' },
                  e('label', null, 'Uwagi (krok)'),
                  e('input', { value: s.notes, onChange: (e) => updateStep(idx, 'notes', e.target.value) })
                ),
                e('div', { className: 'row' },
                  e('label', null, 'Obserwacje (krok)'),
                  e('textarea', { value: s.observations, onChange: (e) => updateStep(idx, 'observations', e.target.value) })
                ),
                e('div', { className: 'row' }, e('button', { type: 'button', onClick: () => removeStep(idx) }, 'Usuń krok'))
              )),
              e('button', { type: 'button', onClick: addStep }, 'Dodaj krok')
            ),
            e('div', { className: 'row' }, e('button', { type: 'submit' }, 'Zapisz'), e('button', { type: 'button', onClick: () => setCreating(false) }, 'Anuluj'))
          ) : (selected ? e('div', { className: 'report-summary' },
            e('h2', null, selected.title || selected.id),
            e('div', null, `id: ${selected.id}`),
            e('div', null, `createdAt: ${selected.createdAt || ''}`),
            e('div', null, `updatedAt: ${selected.updatedAt || ''}`),
            e('hr'),
            e('h3', null, 'Kroki'),
            e('ol', null, (selected.steps || []).map(s => e('li', { key: s.stepNumber || Math.random() },
              e('div', null, `Krok ${s.stepNumber || ''} — ${s.startTime || ''} → ${s.endTime || ''} (${s.durationMin ? s.durationMin + ' min' : '—'})`),
              e('div', null, s.description || ''),
              e('div', null, 'Surowce: ' + ((s.materials || []).map(m => `${m.name || ''}${m.grams != null ? ' ('+m.grams+' g)' : ''}`).join('; ')))
            ))),
            e('hr'),
            e('div', null,
              e('button', { onClick: () => doExport(selected.id) }, 'Eksportuj do MD'),
              e('button', { onClick: () => doExportXlsx(selected.id), style: { marginLeft: 8 } }, 'Eksportuj do Excel (.xlsx)'),
              e('button', { onClick: () => { setForm({ id: selected.id, title: selected.title || '', steps: Array.isArray(selected.steps) && selected.steps.length ? selected.steps : [emptyStep(1)] }); setCreating(true); setSelected(null); }, style: { marginLeft: 8 } }, 'Edytuj'),
              e('button', { onClick: async () => { if (!confirm('Na pewno usunąć raport?')) return; await doDelete(selected.id); }, style: { marginLeft: 8 } }, 'Usuń')
            )
          ) : e('div', null, 'Wybierz raport lub utwórz nowy'))
        )
      )
    );
  }

  ReactDOM.createRoot(root).render(e(App));
})();
