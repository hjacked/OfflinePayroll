const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  employee: {
    list: (filters) => ipcRenderer.invoke('employee.list', filters),
    get: (id) => ipcRenderer.invoke('employee.get', id),
    create: (payload) => ipcRenderer.invoke('employee.create', payload),
    update: (id, payload) => ipcRenderer.invoke('employee.update', id, payload),
    setStatus: (id, active) => ipcRenderer.invoke('employee.setStatus', id, active),
    delete: (id) => ipcRenderer.invoke('employee.delete', id),
  },
  attendance: {
    list: (filters) => ipcRenderer.invoke('attendance.list', filters),
    get: (id) => ipcRenderer.invoke('attendance.get', id),
    summary: (filters) => ipcRenderer.invoke('attendance.summary', filters),
    create: (payload) => ipcRenderer.invoke('attendance.create', payload),
    update: (id, payload) => ipcRenderer.invoke('attendance.update', id, payload),
    delete: (id) => ipcRenderer.invoke('attendance.delete', id),
    importRows: (rows) => ipcRenderer.invoke('attendance.import', rows),
  },
  schedule: {
    list: (filters) => ipcRenderer.invoke('schedule.list', filters),
    create: (payload) => ipcRenderer.invoke('schedule.create', payload),
    update: (id, payload) => ipcRenderer.invoke('schedule.update', id, payload),
    delete: (id) => ipcRenderer.invoke('schedule.delete', id),
    assignments: (filters) => ipcRenderer.invoke('schedule.assignments', filters),
    assign: (payload) => ipcRenderer.invoke('schedule.assign', payload),
    unassign: (id) => ipcRenderer.invoke('schedule.unassign', id),
  },
  attendanceCorrection: {
    list: (filters) => ipcRenderer.invoke('attendanceCorrection.list', filters),
    create: (payload) => ipcRenderer.invoke('attendanceCorrection.create', payload),
    review: (id, payload) => ipcRenderer.invoke('attendanceCorrection.review', id, payload),
  },
  payroll: {
    createPeriod: (payload) => ipcRenderer.invoke('payroll.createPeriod', payload),
    run: (id) => ipcRenderer.invoke('payroll.run', id),
  },
});
