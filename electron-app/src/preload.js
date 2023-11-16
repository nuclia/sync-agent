// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  startProcess: () => ipcRenderer.send("start-process"),
  stopProcess: () => ipcRenderer.send("stop-process"),
  getProcessStatus: () => ipcRenderer.invoke("get-process-status"),
  onUpdateProcessStatus: (callback) =>
    ipcRenderer.on("update-process-status", callback),
});
