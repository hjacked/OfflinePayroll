import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { initDb } from './db';
import { setupIpc } from './ipc';

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  const devServerUrl = process.env.ELECTRON_DEV_SERVER_URL;
  if (devServerUrl) {
    await win.loadURL(devServerUrl);
  } else {
    await win.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await initDb();
  setupIpc(ipcMain);
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
}).catch((error: unknown) => {
  console.error('Failed to start the payroll application:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
