import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../mock/fonts');

const fonts = [
  {
    name: 'Vazirmatn[wght].ttf',
    url: 'https://github.com/rastikerdar/vazirmatn/raw/master/fonts/variable/Vazirmatn%5Bwght%5D.ttf',
  },
  {
    name: 'Vazirmatn-Regular.ttf',
    url: 'https://github.com/rastikerdar/vazirmatn/raw/master/fonts/ttf/Vazirmatn-Regular.ttf',
  },
  {
    name: 'Vazirmatn-Bold.ttf',
    url: 'https://github.com/rastikerdar/vazirmatn/raw/master/fonts/ttf/Vazirmatn-Bold.ttf',
  },
  {
    name: 'Vazirmatn-Medium.ttf',
    url: 'https://github.com/rastikerdar/vazirmatn/raw/master/fonts/ttf/Vazirmatn-Medium.ttf',
  },
  {
    name: 'Vazirmatn-Light.ttf',
    url: 'https://github.com/rastikerdar/vazirmatn/raw/master/fonts/ttf/Vazirmatn-Light.ttf',
  },
];

await mkdir(outDir, { recursive: true });

for (const font of fonts) {
  const dest = path.join(outDir, font.name);
  process.stdout.write(`Downloading ${font.name}... `);
  const res = await fetch(font.url);
  if (!res.ok || !res.body) {
    console.log(`FAILED (${res.status})`);
    continue;
  }
  await pipeline(res.body, createWriteStream(dest));
  console.log('OK');
}

console.log('Seed fonts ready in mock/fonts/');
