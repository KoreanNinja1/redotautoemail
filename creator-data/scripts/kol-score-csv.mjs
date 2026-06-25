#!/usr/bin/env node
/**
 * Score channels in a Nox queue CSV via KOL Intelligence API.
 * Usage: node kol-score-csv.mjs <input.csv> [market]
 */
import fs from 'fs';
import path from 'path';
import { PATHS } from './paths.mjs';
import { appendRasBlacklist, esc, isContactable } from './dedupe.mjs';

const inputCsv = process.argv[2];
const market = process.argv[3] || 'India';
if (!inputCsv || !fs.existsSync(inputCsv)) {
  console.error('Usage: node kol-score-csv.mjs <input.csv> [market]');
  process.exit(1);
}

const ENV_FILE = PATHS.kolEnv;
const env = Object.fromEntries(
  fs
    .readFileSync(ENV_FILE, 'utf8')
    .trim()
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
);
const BASE = env.YTK_BASE_URL;
const KEY = env.YTK_API_KEY;

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getSnapshot(channelId) {
  const res = await fetch(`${BASE}/api/channels/${channelId}/snapshot`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function refreshReport(channelId) {
  const res = await fetch(`${BASE}/api/jobs/report-refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel_id: channelId, market }),
  });
  const json = await res.json();
  if (!json.job_id && !json.ok) return { ok: false, json };
  const jobId = json.job_id || json.id;
  if (!jobId) {
    if (json.report || json.cached) return { ok: true, cached: true };
    return { ok: false, json };
  }
  for (let i = 0; i < 40; i++) {
    await sleep(2000);
    const jr = await fetch(`${BASE}/api/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const job = await jr.json();
    if (job.status === 'done' || job.status === 'completed') return { ok: true, job };
    if (job.status === 'failed' || job.status === 'error') return { ok: false, job };
  }
  return { ok: false, timeout: true };
}

function extractScore(json) {
  if (!json) return { score: '', verdict: '', category: '', comment_score: '' };
  return {
    score: json.score_100 ?? json.score ?? '',
    verdict: json.verdict ?? '',
    category: json.input?.category ?? json.category ?? '',
    comment_score:
      json.breakdown?.comment_authenticity ??
      json.metrics?.comment_overall_score ??
      '',
  };
}

const raw = fs.readFileSync(inputCsv, 'utf8').trim().split(/\r?\n/);
const header = parseCsvLine(raw[0]);
const rows = raw.slice(1).map((line) => {
  const cols = parseCsvLine(line);
  const obj = {};
  header.forEach((h, i) => {
    obj[h] = cols[i] ?? '';
  });
  return obj;
});

const results = [];
let alreadyScored = 0;
let refreshed = 0;
let failed = 0;

for (const row of rows) {
  const channelId = row.channel_id;
  if (!channelId) {
    row.score_status = 'no_channel_id';
    results.push(row);
    failed++;
    continue;
  }

  let snap = await getSnapshot(channelId);
  let { score, verdict, category, comment_score } = extractScore(snap.json);

  if (score === '' && snap.status !== 200) {
    const refresh = await refreshReport(channelId);
    if (refresh.ok) {
      refreshed++;
      await sleep(1500);
      snap = await getSnapshot(channelId);
      ({ score, verdict, category, comment_score } = extractScore(snap.json));
    }
  } else if (score === '' && snap.status === 200) {
    const refresh = await refreshReport(channelId);
    if (refresh.ok) {
      refreshed++;
      await sleep(1500);
      snap = await getSnapshot(channelId);
      ({ score, verdict, category, comment_score } = extractScore(snap.json));
    }
  } else if (score !== '') {
    alreadyScored++;
  }

  row.ras_score = score !== '' ? String(score) : '';
  row.bd_verdict = verdict;
  row.category = category || row.category || '';
  row.comment_score = comment_score !== '' ? String(comment_score) : row.comment_score || '';
  row.score_status = score !== '' ? 'scored' : snap.status === 404 ? 'not_in_kol_db' : 'refresh_failed';
  if (row.score_status !== 'scored') failed++;

  results.push(row);
  process.stderr.write(`scored ${row.channel_name}: ${row.ras_score || row.score_status}\n`);
  await sleep(300);
}

results.sort(
  (a, b) =>
    (Number(b.ras_score) || 0) - (Number(a.ras_score) || 0) ||
    (Number(b.avg_views) || 0) - (Number(a.avg_views) || 0)
);
results.forEach((r, i) => {
  r.priority_rank = String(i + 1);
});

const outHeader = [...new Set([...header, 'category', 'comment_score'])];
const scoredPath = inputCsv.replace(/\.csv$/, '_scored.csv');
const readyPath = inputCsv.replace(/\.csv$/, '_ready.csv');
const sourceBatch = path.basename(inputCsv, '.csv');

const ready = results.filter((r) => isContactable(r.ras_score, r.bd_verdict));
const blacklisted = results.filter(
  (r) => r.ras_score !== '' && !isContactable(r.ras_score, r.bd_verdict)
);

const writeCsv = (filePath, data) =>
  fs.writeFileSync(
    filePath,
    [outHeader.join(','), ...data.map((r) => outHeader.map((h) => esc(r[h])).join(','))].join('\n') + '\n'
  );

writeCsv(scoredPath, results);
writeCsv(readyPath, ready);
writeCsv(inputCsv, ready);

const addedBlacklist = appendRasBlacklist(blacklisted, { sourceBatch });

const scored = results.filter((r) => r.ras_score);
console.log(
  JSON.stringify(
    {
      input: inputCsv,
      scored_full: scoredPath,
      ready_ge60: readyPath,
      total: results.length,
      scored: scored.length,
      ready_for_contact: ready.length,
      added_to_ras_blacklist: addedBlacklist,
      already_in_db: alreadyScored,
      report_refresh_triggered: refreshed,
      failed: results.length - scored.length,
      top: ready.slice(0, 8).map((r) => ({
        name: r.channel_name,
        ras: r.ras_score,
        verdict: r.bd_verdict,
        email: r.email,
      })),
      blacklisted: blacklisted.map((r) => ({
        name: r.channel_name,
        ras: r.ras_score,
        verdict: r.bd_verdict,
      })),
    },
    null,
    2
  )
);
