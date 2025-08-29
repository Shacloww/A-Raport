const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listReports: () => ipcRenderer.invoke('listReports'),
  getReport: (id) => ipcRenderer.invoke('getReport', id),
  createReport: (r) => ipcRenderer.invoke('createReport', r),
  exportMd: (id) => ipcRenderer.invoke('exportMd', id),
  exportXlsx: (id) => ipcRenderer.invoke('exportXlsx', id)
  ,
  deleteReport: (id) => ipcRenderer.invoke('deleteReport', id)
});
