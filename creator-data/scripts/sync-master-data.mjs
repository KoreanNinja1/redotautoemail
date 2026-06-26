#!/usr/bin/env node
/**
 * Audit creator-data, merge existing RAS scores into master, score pending rows,
 * rebuild kol_uncontacted_master.csv from ready (RAS>=60, not outreach).
 *
 * Usage:
 *   node sync-master-data.mjs           # merge + score pending + rebuild
 *   node sync-master-data.mjs --dry-run # audit only, no API / no writes
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  appendRasBlacklist,
  compareByScoreDesc,
  esc,
  inDedupeSet,
  isContactable,
  loadOutreach,
  loadRasBlacklist,
  sortRasResults,
} from './dedupe.mjs';
import { PATHS, PROJECT } from './paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const MASTER = path.join(PATHS.queues, 'kol_uncontacted_master.csv');
const ALL_SCORED = path.join(PATHS.queues, 'batches/results/all_scored.csv');
const ALL_READY = path.join(PATHS.queues, 'batches/results/all_ready.csv');
const BY_COUNTRY_DIR = path.join(PATHS.queues, 'batches/results/by_country');
const BATCH_DIR = path.join(PATHS.queues, 'batches');
const DATE = new Date().toISOString().slice(0, 10);

const MARKET = {
  BR: 'Brazil',
  IN: 'India',
  CO: 'Colombia',
  AR: 'Argentina',
  CL: 'Chile',
  PE: 'Peru',
  VE: 'Venezuela',
  OTHERS: 'India',
};

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

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return { header: [], rows: [] };
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return { header: [], rows: [] };
  const lines = raw.split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = cols[i] ?? '';
    });
    return obj;
  });
  return { header, rows };
}

function writeCsv(filePath, header, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    [header.join(','), ...rows.map((r) => header.map((h) => esc(r[h])).join(','))].join('\n') + '\n'
  );
}

function mergeScoreFields(target, source) {
  for (const k of ['ras_score', 'bd_verdict', 'category', 'comment_score', 'score_status']) {
    if (source[k]) target[k] = source[k];
  }
}

function scoreLookupMaps() {
  const byId = new Map();
  const { rows } = readCsv(ALL_SCORED);
  for (const r of rows) {
    if (r.channel_id) byId.set(r.channel_id, r);
  }
  for (const file of fs.readdirSync(BATCH_DIR).filter((f) => f.endsWith('_scored.csv'))) {
    for (const r of readCsv(path.join(BATCH_DIR, file)).rows) {
      if (r.channel_id && r.ras_score) byId.set(r.channel_id, r);
    }
  }
  return byId;
}

function runScoreBatch(batchPath, market) {
  process.stderr.write(`\n=== scoring ${path.basename(batchPath)} (${market}) ===\n`);
  execFileSync('node', [path.join(__dirname, 'kol-score-csv.mjs'), batchPath, market], {
    cwd: PROJECT,
    stdio: 'inherit',
    env: process.env,
  });
  return readCsv(batchPath.replace(/\.csv$/, '_scored.csv')).rows;
}

function rebuildCumulative(scoredRows, header) {
  const existing = readCsv(ALL_SCORED);
  const byId = new Map();
  for (const r of existing.rows) {
    if (r.channel_id) byId.set(r.channel_id, r);
  }
  for (const r of scoredRows) {
    if (r.channel_id) byId.set(r.channel_id, r);
  }
  const merged = sortRasResults([...byId.values()]);
  const outHeader = [
    ...new Set([
      ...(existing.header.length ? existing.header : header),
      'ras_score',
      'bd_verdict',
      'category',
      'comment_score',
      'score_status',
    ]),
  ];
  const ready = merged.filter((r) => isContactable(r.ras_score, r.bd_verdict));
  if (!DRY_RUN) {
    writeCsv(ALL_SCORED, outHeader, merged);
    writeCsv(ALL_READY, outHeader, ready);
    fs.mkdirSync(BY_COUNTRY_DIR, { recursive: true });
    const byCountry = new Map();
    for (const r of ready) {
      const c = (r.country || r.market || 'UNKNOWN').trim();
      if (!byCountry.has(c)) byCountry.set(c, []);
      byCountry.get(c).push(r);
    }
    for (const [country, grp] of byCountry) {
      grp.sort(compareByScoreDesc);
      grp.forEach((r, i) => {
        r.priority_rank = String(i + 1);
      });
      writeCsv(path.join(BY_COUNTRY_DIR, `ready_${country}_${DATE}.csv`), outHeader, grp);
    }
  }
  return { merged, ready, outHeader };
}

// --- main ---
const outreach = loadOutreach();
const rasBl = loadRasBlacklist();
const scoreMap = scoreLookupMaps();
const master = readCsv(MASTER);

const audit = {
  master_rows: master.rows.length,
  master_with_ras_before: 0,
  merged_from_existing_scores: 0,
  pending_before_score: 0,
  outreach_hits_in_master: 0,
  ras_blacklist_hits_in_master: 0,
  scored_new: 0,
  ready_ge60: 0,
  below60_new: 0,
  still_unscored: 0,
  failed_score: 0,
};

for (const row of master.rows) {
  if (row.ras_score) audit.master_with_ras_before++;
  const hit = scoreMap.get(row.channel_id);
  if (hit?.ras_score && !row.ras_score) {
    mergeScoreFields(row, hit);
    audit.merged_from_existing_scores++;
  }
  if (inDedupeSet(outreach, row)) audit.outreach_hits_in_master++;
  if (inDedupeSet(rasBl, row)) audit.ras_blacklist_hits_in_master++;
}

let pending = master.rows.filter((r) => !(r.ras_score || '').trim());
audit.pending_before_score = pending.length;

if (!DRY_RUN && pending.length) {
  const byCountry = new Map();
  for (const r of pending) {
    const c = (r.country || r.market || 'UNKNOWN').trim();
    if (!byCountry.has(c)) byCountry.set(c, []);
    byCountry.get(c).push(r);
  }

  const newlyScored = [];
  for (const [country, grp] of [...byCountry.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const slug = `remainder_${country}`;
    const batchPath = path.join(BATCH_DIR, `score_batch_${slug}_${DATE}.csv`);
    writeCsv(batchPath, master.header, grp);
    const rows = runScoreBatch(batchPath, MARKET[country] || country);
    newlyScored.push(...rows);
    audit.scored_new += rows.filter((r) => r.ras_score).length;
    audit.failed_score += rows.filter((r) => !r.ras_score).length;
    audit.below60_new += rows.filter(
      (r) => r.ras_score && !isContactable(r.ras_score, r.bd_verdict)
    ).length;
    for (const r of rows) {
      if (r.channel_id) scoreMap.set(r.channel_id, r);
      const m = master.rows.find((x) => x.channel_id === r.channel_id);
      if (m) mergeScoreFields(m, r);
    }
  }

  rebuildCumulative(newlyScored, master.header);
}

// Rebuild master: merge all scores, drop outreach / below60 / unscored
for (const row of master.rows) {
  const hit = scoreMap.get(row.channel_id);
  if (hit?.ras_score) mergeScoreFields(row, hit);
}

const filtered = master.rows.filter((row) => {
  if (inDedupeSet(outreach, row)) return false;
  if (inDedupeSet(rasBl, row)) return false;
  if (!isContactable(row.ras_score, row.bd_verdict)) {
    if (row.ras_score && !DRY_RUN) {
      appendRasBlacklist([row], { sourceBatch: `sync_master_${DATE}` });
    }
    return false;
  }
  return true;
});

audit.still_unscored = filtered.filter((r) => !(r.ras_score || '').trim()).length;
audit.ready_ge60 = filtered.length;

sortRasResults(filtered);
const outHeader = [
  ...new Set([
    ...master.header,
    'ras_score',
    'bd_verdict',
    'category',
    'comment_score',
    'score_status',
  ]),
];

if (!DRY_RUN) {
  writeCsv(MASTER, outHeader, filtered);
  rebuildCumulative(filtered, outHeader);
}

console.log(
  JSON.stringify(
    {
      dry_run: DRY_RUN,
      master_file: MASTER,
      all_ready: ALL_READY,
      all_scored: ALL_SCORED,
      audit,
      master_rebuilt_count: filtered.length,
      by_country_ready: filtered.reduce((acc, r) => {
        const c = r.country || r.market || 'UNKNOWN';
        acc[c] = (acc[c] || 0) + 1;
        return acc;
      }, {}),
    },
    null,
    2
  )
);
