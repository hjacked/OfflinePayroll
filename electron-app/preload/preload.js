const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  employee: {
    list: (filters) =>
      ipcRenderer.invoke('employee.list', filters),

    get: (id) =>
      ipcRenderer.invoke('employee.get', id),

    create: (payload) =>
      ipcRenderer.invoke('employee.create', payload),

    update: (id, payload) =>
      ipcRenderer.invoke('employee.update', id, payload),

    setStatus: (id, active) =>
      ipcRenderer.invoke('employee.setStatus', id, active),

    delete: (id) =>
      ipcRenderer.invoke('employee.delete', id),
  },

  payroll: {
    createPeriod: (payload) =>
      ipcRenderer.invoke('payroll.createPeriod', payload),

    run: (id) =>
      ipcRenderer.invoke('payroll.run', id),
  },
});