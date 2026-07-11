import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { parseArguments, readPem, verifyLicense } from './license-core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const toolRoot = path.resolve(here, '..');
const args = parseArguments(process.argv.slice(2));
const input = args.file || process.argv.find((value) => value.endsWith('.license'));
if (!input) throw new Error('Use --file path/to/customer.license.');
const file = JSON.parse(await readFile(path.resolve(String(input)), 'utf8'));
const publicKey = await readPem(path.join(toolRoot, '.keys', 'public-key.pem'));
const valid = verifyLicense(file, publicKey);
console.log(valid ? 'VALID LICENSE' : 'INVALID LICENSE');
if (!valid) process.exitCode = 1;
else console.log(JSON.stringify(file.payload, null, 2));
