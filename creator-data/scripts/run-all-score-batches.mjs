#!/usr/bin/env node
/**
 * Run all score batches sequentially; merge results after each batch.
 * Usage: node run-all-score-batches.mjs
 */
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { esc, isContactable, sortRasResults, compareByScoreDesc } from './dedupe.mjs';
import { PATHS, PROJECT } from './paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = path.join(PATHS.queues, 'batches');
const RESULT_DIR = path.join(BATCH_DIR, 'results');
const PROGRESS_FILE = path.join(RESULT_DIR, 'batch_progress.json');

const BATCHES = [
  ['score_batch_IN_2026-06-25.csv', 'India'],
  ['score_batch_OTHERS_2026-06-25.csv', 'India'],
  ['score_batch_CO_2026-06-25.csv', 'Colombia'],
  ['score_batch_AR_2026-06-25.csv', 'Argentina'],
  ['score_batch_CL_2026-06-25.csv', 'Chile'],
  ['score_batch_PE_2026-06-25.csv', 'Peru'],
  ['score_batch_VE_2026-06-25.csv', 'Venezuela'],
  ['score_batch_BR_part1_2026-06-25.csv', 'Brazil'],
  ['score_batch_BR_part2_2026-06-25.csv', 'Brazil'],
  ['score_batch_BR_part3_2026-06-25.csv', 'Brazil'],
];

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
  fs.writeFileSync(
    filePath,
    [header.join(','), ...rows.map((r) => header.map((h) => esc(r[h])).join(','))].join('\n') + '\n'
  );
}

function ensureScoredComplete(scoredPath) {
  const { header, rows } = readCsv(scoredPath);
  if (!rows.length) return;
  let changed = false;
  for (const r of rows) {
    if (!(r.ras_score || '').trim() && !(r.score_status || '').trim()) {
      r.score_status = 'refresh_failed';
      changed = true;
    }
  }
  if (changed) {
    const outHeader = [...new Set([...header, 'score_status'])];
    writeCsv(scoredPath, outHeader, rows);
  }
}

function batchDone(_inputPath, scoredPath) {
  ensureScoredComplete(scoredPath);
  if (!fs.existsSync(scoredPath)) return false;
  const scored = readCsv(scoredPath);
  if (!scored.rows.length) return false;
  return scored.rows.every(
    (r) => (r.ras_score || '').trim() || (r.score_status || '').trim()
  );
}

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function waitForBatch(inputPath, scoredPath, maxWaitMs = 3600000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (batchDone(inputPath, scoredPath)) return true;
    process.stderr.write(`waiting for ${path.basename(scoredPath)}...\n`);
    sleep(15000);
  }
  return batchDone(inputPath, scoredPath);
}

function mergeCumulative(allScoredPath, allReadyPath, newRows, header) {
  const existing = readCsv(allScoredPath);
  const byId = new Map();
  for (const r of existing.rows) {
    if (r.channel_id) byId.set(r.channel_id, r);
  }
  for (const r of newRows) {
    if (r.channel_id) byId.set(r.channel_id, r);
  }
  const merged = [...byId.values()];
  sortRasResults(merged);
  const outHeader = [...new Set([...(existing.header.length ? existing.header : header), 'score_status', 'comment_score'])];
  const ready = merged.filter((r) => isContactable(r.ras_score, r.bd_verdict));
  writeCsv(allScoredPath, outHeader, merged);
  writeCsv(allReadyPath, outHeader, ready);
  return {
    total: merged.length,
    ready: ready.length,
    below60: merged.filter((r) => r.ras_score && !isContactable(r.ras_score, r.bd_verdict)).length,
  };
}

fs.mkdirSync(RESULT_DIR, { recursive: true });
const allScoredPath = path.join(RESULT_DIR, 'all_scored.csv');
const allReadyPath = path.join(RESULT_DIR, 'all_ready.csv');
const progress = fs.existsSync(PROGRESS_FILE)
  ? JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
  : { completed: [], batches: {} };

const scoreScript = path.join(__dirname, 'kol-score-csv.mjs');

for (const [file, market] of BATCHES) {
  const inputPath = path.join(BATCH_DIR, file);
  const scoredPath = inputPath.replace(/\.csv$/, '_scored.csv');
  const slug = file.replace('.csv', '');

  if (progress.completed.includes(slug) && batchDone(inputPath, scoredPath)) {
    process.stderr.write(`skip (done): ${slug}\n`);
    continue;
  }

  if (!batchDone(inputPath, scoredPath)) {
    process.stderr.write(`\n=== scoring ${slug} (${market}) ===\n`);
    let ok = false;
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
      if (attempt > 1) {
        process.stderr.write(`retry ${slug} (attempt ${attempt})...\n`);
        sleep(30000);
      }
      const r = spawnSync('node', [scoreScript, inputPath, market], {
        cwd: PROJECT,
        stdio: 'inherit',
        env: process.env,
      });
      ok = r.status === 0 && batchDone(inputPath, scoredPath);
      if (!ok) process.stderr.write(`batch attempt ${attempt} failed: ${slug}\n`);
    }
  }

  if (!batchDone(inputPath, scoredPath)) {
    throw new Error(`Batch incomplete: ${slug}`);
  }

  const { header, rows } = readCsv(scoredPath);
  const stats = mergeCumulative(allScoredPath, allReadyPath, rows, header);
  const readyN = rows.filter((r) => isContactable(r.ras_score, r.bd_verdict)).length;
  progress.batches[slug] = {
    market,
    total: rows.length,
    ready_ge60: readyN,
    scored: rows.filter((r) => r.ras_score).length,
    finished_at: new Date().toISOString(),
  };
  if (!progress.completed.includes(slug)) progress.completed.push(slug);
  progress.cumulative = stats;
  progress.updated_at = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  process.stderr.write(
    `saved ${slug}: ${readyN}/${rows.length} ready | cumulative ${stats.ready}/${stats.total}\n`
  );
}

console.log(
  JSON.stringify(
    {
      done: true,
      progress_file: PROGRESS_FILE,
      all_scored: allScoredPath,
      all_ready: allReadyPath,
      ...progress,
    },
    null,
    2
  )
);
