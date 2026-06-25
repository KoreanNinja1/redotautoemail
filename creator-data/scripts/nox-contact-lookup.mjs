#!/usr/bin/env node
/**
 * Trigger KOL Intelligence nox-contact jobs and print results.
 * Usage: node nox-contact-lookup.mjs [channel_id ...]
 */
import fs from 'fs';

const ENV_FILE =
  '/Users/kennyyifeichen/Downloads/.agents/skills/redotpay-youtube-kol-intelligence/.env.local';
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
const BASE = env.YTK_BASE_URL || 'https://kol.redotpay.club';
const KEY = env.YTK_API_KEY;

const defaultTargets = [
  { channel_id: 'UCt2PIIb4V9nJqKxmlcsVn7A', market: 'Saudi Arabia', name: 'easy crypto' },
  {
    channel_id: 'UCIJpww7DaUSiMca5aKno2hQ',
    market: 'Saudi Arabia',
    name: 'Abdullah official yt',
  },
  {
    channel_id: 'UCpM6L_Rw1VIfTYjdnRIJGpA',
    market: 'Saudi Arabia',
    name: 'Tariq.crypto',
  },
  { channel_id: 'UC9AtiQQ64WZnQupVB4WRDLg', market: 'Saudi Arabia', name: 'Ehab Hosni' },
];

const channelIds = process.argv.slice(2);
const targets =
  channelIds.length > 0
    ? channelIds.map((id) => ({ channel_id: id, market: 'Saudi Arabia', name: id }))
    : defaultTargets;

async function postJob(body) {
  const res = await fetch(`${BASE}/api/jobs/nox-contact`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

const results = [];
for (const t of targets) {
  const preview = await postJob({
    channel_id: t.channel_id,
    market: t.market,
    dry_run: true,
  });
  const run = await postJob({
    channel_id: t.channel_id,
    market: t.market,
    force: true,
  });
  results.push({
    name: t.name,
    channel_id: t.channel_id,
    preview_status: preview.status,
    preview: preview.json,
    run_status: run.status,
    run: run.json,
  });
}

console.log(JSON.stringify(results, null, 2));
