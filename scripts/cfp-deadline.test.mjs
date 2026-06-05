import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('CFP deadlines close after the listed date', () => {
  const { isCfpDeadlinePassed, parseCfpDeadline } = require(
    '../utils/cfp-deadline.js'
  );

  assert.equal(
    parseCfpDeadline('9 June, 2026')?.toISOString(),
    new Date(2026, 5, 9, 23, 59, 59, 999).toISOString()
  );
  assert.equal(
    isCfpDeadlinePassed('9 June, 2026', new Date(2026, 5, 9, 12)),
    false
  );
  assert.equal(
    isCfpDeadlinePassed('9 June, 2026', new Date(2026, 5, 10)),
    true
  );
});

test('CFP deadlines without a concrete date are not treated as expired', () => {
  const { isCfpDeadlinePassed } = require('../utils/cfp-deadline.js');

  assert.equal(
    isCfpDeadlinePassed('Not announced yet', new Date(2026, 5, 10)),
    false
  );
  assert.equal(isCfpDeadlinePassed('', new Date(2026, 5, 10)), false);
});

test('CFP page keeps CFP cards but disables expired submissions', async () => {
  const cfpIndex = await readFile(
    new URL('../pages/cfp/index.tsx', import.meta.url),
    'utf8'
  );

  assert.match(cfpIndex, /isCfpDeadlinePassed/);
  assert.match(cfpIndex, /CFP deadline has passed/);
  assert.match(cfpIndex, /disabled/);
  assert.doesNotMatch(cfpIndex, /getOpenCfpEntries/);
});

test('venue page disables speaker applications after the CFP deadline', async () => {
  const venuePage = await readFile(
    new URL('../pages/venue/[id].tsx', import.meta.url),
    'utf8'
  );

  assert.match(venuePage, /isCfpDeadlinePassed/);
  assert.match(venuePage, /cfpDeadlinePassed/);
  assert.match(venuePage, /CFP deadline has passed/);
  assert.match(venuePage, /Apply to be a speaker/);
});

test('header CFP behavior remains URL-only and unchanged', async () => {
  const header = await readFile(
    new URL('../components/Header/header.tsx', import.meta.url),
    'utf8'
  );

  assert.match(header, /cities\.some\(\(city\) => resolveCfpUrl\(city\.cfp\)\)/);
  assert.doesNotMatch(header, /isCfpDeadlinePassed/);
  assert.doesNotMatch(header, /CFP deadline has passed/);
});
