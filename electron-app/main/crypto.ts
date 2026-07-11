import crypto from 'node:crypto';

const VERSION = 'v1';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 310_000;

export function generateSalt(size = 16): Buffer {
  return crypto.randomBytes(size);
}

export function deriveKey(password: string, salt: Buffer | string): Buffer {
  if (!password) {
    throw new Error('A password is required to derive an encryption key.');
  }

  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256',
  );
}

export function encrypt(plainText: string, key: Buffer): string {
  assertKeyLength(key);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decrypt(cipherText: string, key: Buffer): string {
  assertKeyLength(key);

  const [version, ivBase64, authTagBase64, dataBase64] = cipherText.split(':');
  if (
    version !== VERSION ||
    !ivBase64 ||
    !authTagBase64 ||
    !dataBase64
  ) {
    throw new Error('Encrypted value has an invalid format.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivBase64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataBase64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function assertKeyLength(key: Buffer): void {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes.`);
  }
}

export default { generateSalt, deriveKey, encrypt, decrypt };
