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

  attendance: {
    list: (filters) =>
      ipcRenderer.invoke('attendance.list', filters),

    get: (id) =>
      ipcRenderer.invoke('attendance.get', id),

    summary: (filters) =>
      ipcRenderer.invoke('attendance.summary', filters),

    create: (payload) =>
      ipcRenderer.invoke('attendance.create', payload),

    update: (id, payload) =>
      ipcRenderer.invoke('attendance.update', id, payload),

    delete: (id) =>
      ipcRenderer.invoke('attendance.delete', id),

    importRows: (rows) =>
      ipcRenderer.invoke('attendance.import', rows),
  },

  schedule: {
    list: (filters) =>
      ipcRenderer.invoke('schedule.list', filters),

    create: (payload) =>
      ipcRenderer.invoke('schedule.create', payload),

    update: (id, payload) =>
      ipcRenderer.invoke('schedule.update', id, payload),

    delete: (id) =>
      ipcRenderer.invoke('schedule.delete', id),

    assignments: (filters) =>
      ipcRenderer.invoke('schedule.assignments', filters),

    assign: (payload) =>
      ipcRenderer.invoke('schedule.assign', payload),

    unassign: (id) =>
      ipcRenderer.invoke('schedule.unassign', id),
  },

  attendanceCorrection: {
    list: (filters) =>
      ipcRenderer.invoke(
        'attendanceCorrection.list',
        filters
      ),

    create: (payload) =>
      ipcRenderer.invoke(
        'attendanceCorrection.create',
        payload
      ),

    review: (id, payload) =>
      ipcRenderer.invoke(
        'attendanceCorrection.review',
        id,
        payload
      ),
  },

  leaveType: {
    list: (filters) =>
      ipcRenderer.invoke('leaveType.list', filters),

    create: (payload) =>
      ipcRenderer.invoke('leaveType.create', payload),

    update: (id, payload) =>
      ipcRenderer.invoke(
        'leaveType.update',
        id,
        payload
      ),

    delete: (id) =>
      ipcRenderer.invoke('leaveType.delete', id),
  },

  leaveBalance: {
    list: (filters) =>
      ipcRenderer.invoke(
        'leaveBalance.list',
        filters
      ),

    adjust: (payload) =>
      ipcRenderer.invoke(
        'leaveBalance.adjust',
        payload
      ),
  },

  leaveRequest: {
    list: (filters) =>
      ipcRenderer.invoke(
        'leaveRequest.list',
        filters
      ),

    get: (id) =>
      ipcRenderer.invoke('leaveRequest.get', id),

    summary: (filters) =>
      ipcRenderer.invoke(
        'leaveRequest.summary',
        filters
      ),

    create: (payload) =>
      ipcRenderer.invoke(
        'leaveRequest.create',
        payload
      ),

    update: (id, payload) =>
      ipcRenderer.invoke(
        'leaveRequest.update',
        id,
        payload
      ),

    review: (id, payload) =>
      ipcRenderer.invoke(
        'leaveRequest.review',
        id,
        payload
      ),

    cancel: (id, payload) =>
      ipcRenderer.invoke(
        'leaveRequest.cancel',
        id,
        payload
      ),
  },

  earningType: {
    list: (filters) =>
      ipcRenderer.invoke(
        'earningType.list',
        filters
      ),

    get: (id) =>
      ipcRenderer.invoke(
        'earningType.get',
        id
      ),

    create: (payload) =>
      ipcRenderer.invoke(
        'earningType.create',
        payload
      ),

    update: (id, payload) =>
      ipcRenderer.invoke(
        'earningType.update',
        id,
        payload
      ),

    setStatus: (id, active) =>
      ipcRenderer.invoke(
        'earningType.setStatus',
        id,
        active
      ),

    delete: (id) =>
      ipcRenderer.invoke(
        'earningType.delete',
        id
      ),
  },

  earningAssignment: {
    list: (filters) =>
      ipcRenderer.invoke(
        'earningAssignment.list',
        filters
      ),

    get: (id) =>
      ipcRenderer.invoke(
        'earningAssignment.get',
        id
      ),

    create: (payload) =>
      ipcRenderer.invoke(
        'earningAssignment.create',
        payload
      ),

    update: (id, payload) =>
      ipcRenderer.invoke(
        'earningAssignment.update',
        id,
        payload
      ),

    delete: (id) =>
      ipcRenderer.invoke(
        'earningAssignment.delete',
        id
      ),
  },

  earningTransaction: {
    list: (filters) =>
      ipcRenderer.invoke(
        'earningTransaction.list',
        filters
      ),

    get: (id) =>
      ipcRenderer.invoke(
        'earningTransaction.get',
        id
      ),

    summary: (filters) =>
      ipcRenderer.invoke(
        'earningTransaction.summary',
        filters
      ),

    create: (payload) =>
      ipcRenderer.invoke(
        'earningTransaction.create',
        payload
      ),

    update: (id, payload) =>
      ipcRenderer.invoke(
        'earningTransaction.update',
        id,
        payload
      ),

    setStatus: (id, status) =>
      ipcRenderer.invoke(
        'earningTransaction.setStatus',
        id,
        status
      ),

    delete: (id) =>
      ipcRenderer.invoke(
        'earningTransaction.delete',
        id
      ),
  },

  payroll: {
    createPeriod: (payload) =>
      ipcRenderer.invoke(
        'payroll.createPeriod',
        payload
      ),

    run: (id) =>
      ipcRenderer.invoke(
        'payroll.run',
        id
      ),
  },
});