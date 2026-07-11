import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';

export const ALL_FEATURES = [
  'employees', 'timekeeping', 'leave', 'earnings', 'deductions',
  'contributions', 'payroll', 'reports', 'payslips', 'settings', 'backup', 'audit',
];

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

export function signPayload(payload, privateKeyPem) {
  return crypto.sign(null, Buffer.from(stableStringify(payload), 'utf8'), privateKeyPem).toString('base64');
}

export function verifyLicense(file, publicKeyPem) {
  if (!file || file.version !== 1 || !file.payload || !file.signature) return false;
  return crypto.verify(
    null,
    Buffer.from(stableStringify(file.payload), 'utf8'),
    publicKeyPem,
    Buffer.from(file.signature, 'base64'),
  );
}

export function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) result[key] = true;
    else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

export function licenseId() {
  return `LIC-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function readPem(path) {
  return readFile(path, 'utf8');
}
