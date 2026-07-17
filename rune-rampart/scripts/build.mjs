import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(projectRoot, 'dist');
const publicEntries = ['index.html', 'styles.css', 'game-config.js', 'game.js', 'assets'];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of publicEntries) {
  await cp(join(projectRoot, entry), join(outputDirectory, entry), { recursive: true });
}

console.log(`Built ${publicEntries.length} public entries in ${outputDirectory}`);
