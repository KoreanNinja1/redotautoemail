#!/usr/bin/env node
/**
 * Split kol_uncontacted_master.csv (has email, no RAS) into score batches.
 * Usage: node split-score-batches.mjs
 */
import fs from 'fs';
import path from 'path';
import { PATHS } from './paths.mjs';
import { esc } from './dedupe.mjs';

const MARKET = {
  BR: 'Brazil',
  IN: 'India',
  CO: 'Colombia',
  AR: 'Argentina',
  CL: 'Chile',
  PE: 'Peru',
  VE: 'Venezuela',
  OTHERS: 'India', // Indian crypto channels mis-tagged
};

const master = path.join(PATHS.queues, 'kol_uncontacted_master.csv');
const outDir = path.join(PATHS.queues, 'batches');
const date = new Date().toISOString().slice(0, 10);

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else if (ch === '"') inQ = true;
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const raw = fs.readFileSync(master, 'utf8').trim().split(/\r?\n/);
const header = parseCsvLine(raw[0]);
const rows = raw.slice(1).map((line) => {
  const cols = parseCsvLine(line);
  const obj = {};
  header.forEach((h, i) => {
    obj[h] = cols[i] ?? '';
  });
  return obj;
});

const pending = rows.filter((r) => (r.email || '').trim() && !(r.ras_score || '').trim());
const byCountry = new Map();
for (const r of pending) {
  const c = (r.country || r.market || 'UNKNOWN').trim();
  if (!byCountry.has(c)) byCountry.set(c, []);
  byCountry.get(c).push(r);
}

fs.mkdirSync(outDir, { recursive: true });
const plan = [];

function writeBatch(slug, grp) {
  const country = slug.startsWith('BR_part') ? 'BR' : slug;
  const market = MARKET[country] || country;
  const file = path.join(outDir, `score_batch_${slug}_${date}.csv`);
  fs.writeFileSync(
    file,
    [header.join(','), ...grp.map((r) => header.map((h) => esc(r[h])).join(','))].join('\n') + '\n'
  );
  plan.push({ slug, market, count: grp.length, file });
}

for (const [country, grp] of [...byCountry.entries()].sort((a, b) => b[1].length - a[1].length)) {
  if (country === 'BR') {
    const size = 72;
    for (let i = 0; i < grp.length; i += size) {
      writeBatch(`BR_part${Math.floor(i / size) + 1}`, grp.slice(i, i + size));
    }
  } else {
    writeBatch(country, grp);
  }
}

console.log(JSON.stringify({ master_pending: pending.length, batches: plan }, null, 2));
