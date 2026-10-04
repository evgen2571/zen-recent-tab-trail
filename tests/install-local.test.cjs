const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('local installation registers real files, preserves other mods and backs up the registry', async t => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'rtt-install-'));
  t.after(() => fs.rm(profile, { recursive: true, force: true }));
  const modsDir = path.join(profile, 'chrome', 'sine-mods');
  await fs.mkdir(modsDir, { recursive: true });
  await fs.mkdir(path.join(profile, 'chrome', 'JS'));
  await fs.writeFile(path.join(profile, 'chrome', 'JS', 'sine.sys.mjs'), '');
  const registry = path.join(modsDir, 'mods.json');
  const initial = { other: { id: 'other', enabled: true, custom: 'keep' } };
  await fs.writeFile(registry, JSON.stringify(initial));
  const install = () => spawnSync(process.execPath, ['tools/install-local.mjs', profile], { encoding: 'utf8' });
  let result = install();
  assert.equal(result.status, 0, result.stderr);
  let mods = JSON.parse(await fs.readFile(registry));
  assert.deepEqual(mods.other, initial.other);
  assert.equal(mods['recent-tab-trail'].enabled, true);
  assert.equal(mods['recent-tab-trail']['no-updates'], true);
  for (const file of ['theme.json', 'preferences.json', 'chrome.css', 'recent-tab-trail.uc.js',
    'README.md', 'LICENSE', 'VERIFICATION.md', 'assets/light.png', 'assets/dark.png']) {
    assert.deepEqual(await fs.readFile(path.join(modsDir, 'recent-tab-trail', file)), await fs.readFile(file));
  }
  const backups = (await fs.readdir(modsDir)).filter(f => f.startsWith('mods.json.rtt-backup-'));
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(modsDir, backups[0]))), initial);
  mods['recent-tab-trail'].enabled = false;
  await fs.writeFile(registry, JSON.stringify(mods));
  result = install(); assert.equal(result.status, 0, result.stderr);
  mods = JSON.parse(await fs.readFile(registry));
  assert.equal(mods['recent-tab-trail'].enabled, false);
  assert.deepEqual(mods.other, initial.other);
});

test('local installer refuses an uninitialized profile or invalid registry without writing', async t => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'rtt-install-'));
  t.after(() => fs.rm(profile, { recursive: true, force: true }));
  const run = () => spawnSync(process.execPath, ['tools/install-local.mjs', profile], { encoding: 'utf8' });
  assert.notEqual(run().status, 0);
  assert.deepEqual(await fs.readdir(profile), []);
  await fs.mkdir(path.join(profile, 'chrome', 'JS'), { recursive: true });
  await fs.writeFile(path.join(profile, 'chrome', 'JS', 'sine.sys.mjs'), '');
  const modsDir = path.join(profile, 'chrome', 'sine-mods');
  await fs.mkdir(modsDir);
  await fs.writeFile(path.join(modsDir, 'mods.json'), '[]');
  assert.notEqual(run().status, 0);
  assert.deepEqual(await fs.readdir(modsDir), ['mods.json']);
});
