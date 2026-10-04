// SPDX-License-Identifier: MIT
// Offline registration using Sine 2.3.3's native sine-mods/mods.json layout.
import { access, copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

async function install() {
  if (process.argv.length !== 3) {
    throw new Error('Usage: node tools/install-local.mjs "/path/to/closed/Zen/profile"');
  }
  const profile = resolve(process.argv[2]);
  const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const modsDir = join(profile, 'chrome', 'sine-mods');
  const registry = join(modsDir, 'mods.json');
  await access(join(profile, 'chrome', 'JS', 'sine.sys.mjs'));
  const original = await readFile(registry, 'utf8');
  const mods = JSON.parse(original);
  if (!mods || Array.isArray(mods) || typeof mods !== 'object') {
    throw new Error('Sine mods.json must contain an object; no files were changed.');
  }
  const theme = JSON.parse(await readFile(join(source, 'theme.json'), 'utf8'));
  const files = ['theme.json', 'preferences.json', 'chrome.css', 'content.css', 'recent-tab-trail.uc.js',
    'README.md', 'LICENSE', 'VERIFICATION.md', 'assets/light.png', 'assets/dark.png', 'assets/light-outline.png', 'assets/dark-outline.png',
    'assets/light-fill.png', 'assets/dark-fill.png'];
  // Validate every input before touching the profile.
  for (const file of files) await access(join(source, file));
  const backup = `${registry}.rtt-backup-${Date.now()}-${process.pid}`;
  await writeFile(backup, original, { flag: 'wx' });
  const target = join(modsDir, theme.id);
  await mkdir(target, { recursive: true });
  for (const file of files) {
    const destination = join(target, file);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(source, file), `${destination}.rtt-tmp`);
    await rename(`${destination}.rtt-tmp`, destination);
  }
  mods[theme.id] = {
    ...theme,
    enabled: mods[theme.id]?.enabled ?? true,
    'no-updates': true,
  };
  await writeFile(`${registry}.rtt-tmp`, JSON.stringify(mods, null, 2) + '\n');
  await rename(`${registry}.rtt-tmp`, registry);
  console.info(`Installed Recent Tab Trail in ${target}\nRegistry backup: ${backup}\nStart Zen, allow unofficial JavaScript in Sine, and enable the mod.`);
}

install().catch(error => {
  console.error(`Local installation failed: ${error.message}\nUse an initialized Sine 2.3.3+ profile and close Zen before installing.`);
  process.exitCode = 1;
});
