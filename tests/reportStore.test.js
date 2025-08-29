const fs = require('fs').promises;
const path = require('path');
const store = require('../src/reportStore');

describe('reportStore basic', () => {
  const tmpId = 'test-report-1';
  const reportsDir = path.resolve(__dirname, '..', 'reports');
  const filePath = path.join(reportsDir, `${tmpId}.json`);

  afterAll(async () => {
    try { await fs.unlink(filePath); } catch (e) {}
    try { await fs.unlink(path.join(reportsDir, `${tmpId}.md`)); } catch (e) {}
  });

  test('create and read report', async () => {
    const r = {
      id: tmpId,
      title: 'test',
      startTime: new Date().toISOString(),
      materials: [{ name: 'A', grams: 1 }]
    };
    const saved = await store.createReport(r);
    expect(saved.id).toBe(tmpId);
    const read = await store.getReport(tmpId);
    expect(read.title).toBe('test');
  });

  test('export md', async () => {
    const mdPath = await store.exportReportMarkdown(tmpId);
    const exists = await fs.readFile(mdPath, 'utf8');
    expect(exists.length).toBeGreaterThan(0);
  });
});
