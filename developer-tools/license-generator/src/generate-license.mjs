import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_FEATURES, licenseId, parseArguments, readPem, signPayload } from './license-core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const toolRoot = path.resolve(here, '..');
const args = parseArguments(process.argv.slice(2));
const edition = String(args.edition || '').toLowerCase();
const customerName = String(args.customer || '').trim();
if (!['trial', 'full_perpetual', 'full_subscription'].includes(edition)) {
  throw new Error('Use --edition trial, full_perpetual, or full_subscription.');
}
if (!customerName) throw new Error('Use --customer "Customer Name".');

const issuedAt = new Date().toISOString();
let expiresAt = null;
const days = Number(args.days || 0);
if (args.expires) expiresAt = new Date(String(args.expires)).toISOString();
else if (edition === 'trial') expiresAt = new Date(Date.now() + (days || 30) * 86_400_000).toISOString();
else if (edition === 'full_subscription') {
  if (!days) throw new Error('Subscription licenses require --days N or --expires YYYY-MM-DD.');
  expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
}

const features = args.features
  ? String(args.features).split(',').map((item) => item.trim()).filter(Boolean)
  : ALL_FEATURES;
const maxEmployees = args['max-employees'] === undefined
  ? (edition === 'trial' ? 5 : null)
  : Number(args['max-employees']);
if (maxEmployees !== null && (!Number.isInteger(maxEmployees) || maxEmployees < 1)) {
  throw new Error('--max-employees must be a positive integer.');
}

const payload = {
  version: 1,
  licenseId: String(args['license-id'] || licenseId()),
  customerName,
  edition,
  issuedAt,
  expiresAt,
  maxEmployees,
  installationId: args['installation-id'] ? String(args['installation-id']).trim() : null,
  features,
  revoked: false,
};

const privateKey = await readPem(path.join(toolRoot, '.keys', 'private-key.pem'));
const file = { version: 1, payload, signature: signPayload(payload, privateKey) };
const outputDirectory = path.join(toolRoot, 'output');
await mkdir(outputDirectory, { recursive: true });
const safeCustomer = customerName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'customer';
const outputPath = args.output
  ? path.resolve(String(args.output))
  : path.join(outputDirectory, `${safeCustomer}-${edition}.license`);
await writeFile(outputPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
console.log(`License created: ${outputPath}`);
console.log(`License ID: ${payload.licenseId}`);
console.log(`Edition: ${payload.edition}`);
console.log(`Expires: ${payload.expiresAt || 'Never'}`);
console.log(`Installation ID: ${payload.installationId || 'Not machine-locked'}`);
