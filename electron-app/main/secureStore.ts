import { app, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

function getStoragePath(): string {
  return path.join(app.getPath('userData'), 'secure-store');
}

function getEntryPath(key: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
    throw new Error('Secure-store keys may only contain letters, numbers, dots, underscores, and dashes.');
  }

  return path.join(getStoragePath(), `${key}.json`);
}

async function ensureDirectory(): Promise<void> {
  await fs.mkdir(getStoragePath(), { recursive: true });
}

export async function saveSecure(key: string, value: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Operating-system encryption is not available on this device.');
  }

  await ensureDirectory();
  const encrypted = safeStorage.encryptString(value).toString('base64');
  await fs.writeFile(
    getEntryPath(key),
    JSON.stringify({ version: 1, value: encrypted }),
    { encoding: 'utf8', mode: 0o600 },
  );
}

export async function loadSecure(key: string): Promise<string | null> {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Operating-system encryption is not available on this device.');
    }

    const raw = await fs.readFile(getEntryPath(key), 'utf8');
    const parsed = JSON.parse(raw) as { version?: number; value?: string };

    if (parsed.version !== 1 || !parsed.value) {
      throw new Error('Secure-store entry has an invalid format.');
    }

    return safeStorage.decryptString(Buffer.from(parsed.value, 'base64'));
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function deleteSecure(key: string): Promise<void> {
  try {
    await fs.unlink(getEntryPath(key));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export default { saveSecure, loadSecure, deleteSecure };
