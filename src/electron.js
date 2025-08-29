const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const store = require('./reportStore');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers
ipcMain.handle('listReports', async () => {
  return await store.listReports();
});

ipcMain.handle('getReport', async (evt, id) => {
  return await store.getReport(id);
});

ipcMain.handle('createReport', async (evt, report) => {
  return await store.createReport(report);
});

ipcMain.handle('exportMd', async (evt, id) => {
  return await store.exportReportMarkdown(id);
});

ipcMain.handle('exportXlsx', async (evt, id) => {
  return await store.exportReportXlsx(id);
});

ipcMain.handle('deleteReport', async (evt, id) => {
  return await store.deleteReport(id);
});
