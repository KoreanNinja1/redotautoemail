#!/usr/bin/env node
/**
 * Move the original 125 ready batch to outreach; keep only remainder-61 work product.
 */
import fs from 'fs';
import path from 'path';
import { esc } from './dedupe.mjs';
import { PATHS } from './paths.mjs';

const DATE = '2026-06-26';
const READY125 = path.join(PATHS.queues, 'batches/results/all_ready_before_outreach_sync.csv');
const OUTREACH = PATHS.outreach;
const BATCH_DIR = path.join(PATHS.queues, 'batches');
const MASTER = path.join(PATHS.queues, 'kol_uncontacted_master.csv');
const ALL_READY = path.join(PATHS.queues, 'batches/results/all_ready.csv');
const REMAINDER61 = path.join(PATHS.queues, `remainder_61_scored_${DATE}.csv`);
const BY_COUNTRY_DIR = path.join(PATHS.queues, 'batches/results/by_country');

const COUNTRY_LABEL = {
  BR: 'Brazil',
  IN: 'India',
  CO: 'Colombia',
  AR: 'Argentina',
  CL: 'Chile',
  PE: 'Peru',
  VE: 'Venezuela',
  OTHERS: 'Others',
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

function isContactable(ras, verdict) {
  if (verdict === 'Exclude') return false;
  const n = Number(ras);
  return Number.isFinite(n) && n >= 60;
}

function loadExistingOutreachKeys() {
  const { rows } = readCsv(OUTREACH);
  const ids = new Set();
  const emails = new Set();
  for (const r of rows) {
    const m = (r.profile_url || '').match(/channel\/(UC[\w-]+)/);
    if (m) ids.add(m[1]);
    if (r.youtube_key?.startsWith('channel:')) ids.add(r.youtube_key.slice(8));
    if (r.email) emails.add(r.email.toLowerCase());
  }
  return { rows, ids, emails };
}

// --- remainder 61 from scored batch files ---
const remainderRows = [];
for (const file of fs.readdirSync(BATCH_DIR).filter((f) => f.startsWith('score_batch_remainder_') && f.endsWith('_scored.csv'))) {
  remainderRows.push(...readCsv(path.join(BATCH_DIR, file)).rows);
}
remainderRows.sort(
  (a, b) =>
    (Number(b.ras_score) || 0) - (Number(a.ras_score) || 0) ||
    (Number(b.subscribers) || 0) - (Number(a.subscribers) || 0)
);
const remHeader = [
  ...new Set([
    ...readCsv(path.join(BATCH_DIR, 'score_batch_remainder_BR_2026-06-26_scored.csv')).header,
    'score_status',
    'comment_score',
  ]),
];
remainderRows.forEach((r, i) => {
  r.priority_rank = String(i + 1);
});
writeCsv(REMAINDER61, remHeader, remainderRows);

// --- append 125 to outreach ---
const ready125 = readCsv(READY125);
const outreachHdr =
  'channel_name,country,platform,profile_url,youtube_key,email,cooperation_status,onboard_status,bd_owner,uid,notes,do_not_contact';
const { rows: existingOutreach, ids, emails } = loadExistingOutreachKeys();
const toAppend = [];
for (const r of ready125.rows) {
  if (!r.channel_id) continue;
  if (ids.has(r.channel_id)) continue;
  if (r.email && emails.has(r.email.toLowerCase())) continue;
  toAppend.push({
    channel_name: r.channel_name,
    country: COUNTRY_LABEL[r.country] || r.country || r.market,
    platform: 'Youtube',
    profile_url: r.profile_url,
    youtube_key: `channel:${r.channel_id}`,
    email: r.email || '',
    cooperation_status: '初次接触',
    onboard_status: '',
    bd_owner: '',
    uid: '',
    notes: `batch_ready_2026-06-25; contacted_${DATE}`,
    do_not_contact: 'yes',
  });
}
if (toAppend.length) {
  fs.appendFileSync(
    OUTREACH,
    toAppend
      .map((r) =>
        [
          r.channel_name,
          r.country,
          r.platform,
          r.profile_url,
          r.youtube_key,
          r.email,
          r.cooperation_status,
          r.onboard_status,
          r.bd_owner,
          r.uid,
          r.notes,
          r.do_not_contact,
        ]
          .map(esc)
          .join(',')
      )
      .join('\n') + '\n'
  );
}

// --- master = only remainder ready (RAS>=60) ---
const masterReady = remainderRows.filter((r) => isContactable(r.ras_score, r.bd_verdict));
masterReady.forEach((r, i) => {
  r.priority_rank = String(i + 1);
  r.outreach_status = 'not_contacted';
});
writeCsv(MASTER, remHeader, masterReady);
writeCsv(ALL_READY, remHeader, masterReady);

fs.mkdirSync(BY_COUNTRY_DIR, { recursive: true });
const byCountry = new Map();
for (const r of masterReady) {
  const c = (r.country || r.market || 'UNKNOWN').trim();
  if (!byCountry.has(c)) byCountry.set(c, []);
  byCountry.get(c).push(r);
}
for (const [country, grp] of byCountry) {
  grp.forEach((r, i) => {
    r.priority_rank = String(i + 1);
  });
  writeCsv(path.join(BY_COUNTRY_DIR, `ready_${country}_${DATE}.csv`), remHeader, grp);
}

console.log(
  JSON.stringify(
    {
      remainder_61_table: REMAINDER61,
      remainder_total: remainderRows.length,
      remainder_ready_ge60: masterReady.length,
      remainder_below60: remainderRows.filter((r) => r.ras_score && !isContactable(r.ras_score, r.bd_verdict)).length,
      remainder_not_in_kol_db: remainderRows.filter((r) => !r.ras_score).length,
      added_to_outreach: toAppend.length,
      master_now: masterReady.length,
      all_ready_now: masterReady.length,
    },
    null,
    2
  )
);
