console.log("PRELOAD LOADED");

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

  employee: {
    list: () => ipcRenderer.invoke("employee.list"),
    get: (id) => ipcRenderer.invoke("employee.get", id)
  },

  payroll: {
    createPeriod: (payload) =>
      ipcRenderer.invoke("payroll.createPeriod", payload),

    run: (id) =>
      ipcRenderer.invoke("payroll.run", id)
  }

});