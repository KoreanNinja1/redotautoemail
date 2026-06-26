#!/usr/bin/env node
/**
 * Fetch emails for India master queue via KOL Intelligence nox-contact job.
 * Usage: node fetch-india-6-emails.mjs [master.csv]
 */
import fs from 'fs';
import path from 'path';
import { esc } from './dedupe.mjs';
import { PATHS } from './paths.mjs';

const MASTER = process.argv[2] || path.join(PATHS.queues, 'kol_uncontacted_master.csv');
const MARKET = 'India';
const DATE = new Date().toISOString().slice(0, 10);

const env = Object.fromEntries(
  fs
    .readFileSync(PATHS.kolEnv, 'utf8')
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

function readCsv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/);
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickContact(json) {
  const c = json?.contact || json?.snapshot?.contact || {};
  const email = c.email || c.value || '';
  return { email, status: c.status || (email ? 'found' : 'missing') };
}

async function getSnapshot(channelId) {
  const res = await fetch(`${BASE}/api/channels/${channelId}/snapshot`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function runNoxContact(channelId) {
  const res = await fetch(`${BASE}/api/jobs/nox-contact`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel_id: channelId, market: MARKET, force: true }),
  });
  const json = await res.json().catch(() => null);
  if (!json?.job_id) {
    return { ok: res.ok && !!json?.ok, json, status: res.status };
  }
  for (let i = 0; i < 40; i++) {
    await sleep(2000);
    const jr = await fetch(`${BASE}/api/jobs/${json.job_id}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const job = await jr.json().catch(() => null);
    if (!job) continue;
    if (job.status === 'done' || job.status === 'completed') return { ok: true, json: job };
    if (job.status === 'failed' || job.status === 'error') return { ok: false, json: job };
  }
  return { ok: false, timeout: true };
}

const { header, rows } = readCsv(MASTER);
const summary = [];

for (const row of rows) {
  const entry = {
    channel_name: row.channel_name,
    channel_id: row.channel_id,
    email_found: false,
    contact_status: '',
    source: '',
  };

  let snap = await getSnapshot(row.channel_id);
  let contact = pickContact(snap.json);

  if (!contact.email) {
    const job = await runNoxContact(row.channel_id);
    entry.source = job.ok ? 'nox_contact_job' : 'job_failed';
    await sleep(1500);
    snap = await getSnapshot(row.channel_id);
    contact = pickContact(snap.json);
  } else {
    entry.source = 'snapshot';
  }

  entry.contact_status = contact.status;
  if (contact.email) {
    row.email = contact.email;
    row.notes = [row.notes, `nox_contact_${DATE}`].filter(Boolean).join('; ');
    entry.email_found = true;
  }

  summary.push(entry);
  process.stderr.write(`${row.channel_name}: ${entry.email_found ? 'found' : entry.contact_status}\n`);
  await sleep(400);
}

writeCsv(MASTER, header, rows);
writeCsv(path.join(PATHS.queues, 'batches/results/all_ready.csv'), header, rows);
writeCsv(path.join(PATHS.queues, 'batches/results/by_country/ready_IN_2026-06-26.csv'), header, rows);

console.log(
  JSON.stringify(
    {
      master: MASTER,
      total: summary.length,
      found: summary.filter((s) => s.email_found).length,
      missing: summary.filter((s) => !s.email_found).length,
      results: summary,
    },
    null,
    2
  )
);
