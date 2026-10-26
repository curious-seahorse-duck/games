import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeMapData } from '../src/game/MapData.mjs';
import { isSkinImage } from '../src/game/SkinImage.mjs';
import { GIFT_CARDS, createCommunityGiftCard } from '../src/game/GiftCards.mjs';

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });

const assetFiles = ['index.html'];
for (const name of await readdir('dist/assets')) assetFiles.push(path.join('assets', name));
const embeddedAssets = {};
for (const name of assetFiles) {
  embeddedAssets[`/${name.replaceAll('\\', '/')}`] = await readFile(path.join('dist', name), 'utf8');
}

const source = await readFile('server/game-api.mjs', 'utf8');
const worker = source
  .replace('const assets = {};', () => `const assets = ${JSON.stringify(embeddedAssets)};`)
  .replace("import { normalizeMapData } from '../src/game/MapData.mjs';", () => `const normalizeMapData = ${normalizeMapData.toString()};`)
  .replace("import { isSkinImage } from '../src/game/SkinImage.mjs';", () => `const isSkinImage = ${isSkinImage.toString()};`)
  .replace("import { GIFT_CARDS, createCommunityGiftCard } from '../src/game/GiftCards.mjs';", () => `const GIFT_CARDS = ${JSON.stringify(GIFT_CARDS)};\nconst createCommunityGiftCard = ${createCommunityGiftCard.toString()};`);
await writeFile('dist/server/index.js', worker, 'utf8');
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
