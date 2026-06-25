#!/usr/bin/env node
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

const BASE = env.YTK_BASE_URL;
const KEY = env.YTK_API_KEY;
const sampleChannel = process.argv[2] || 'UCI7_t2Eo3kAH6Vi8hfUHUpQ'; // The Scalper King
const count = Number(process.argv[3] || 17);

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
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
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json };
}

const manifestRes = await fetch(`${BASE}/api/product/manifest`, {
  headers: { Authorization: `Bearer ${KEY}` },
});
const manifest = await manifestRes.json();

const dry = await post('/api/jobs/report-refresh', {
  channel_id: sampleChannel,
  market: 'India',
  dry_run: true,
});

const dryBatch = await post('/api/jobs/report-refresh', {
  channel_ids: [sampleChannel],
  market: 'India',
  dry_run: true,
});

console.log(
  JSON.stringify(
    {
      channels_to_refresh: count,
      manifest_jobs: manifest?.endpoints?.POST || manifest?.jobs || null,
      manifest_principles: manifest?.principles,
      single_dry_run: { status: dry.status, body: dry.json },
      batch_dry_run: { status: dryBatch.status, body: dryBatch.json },
      rule_of_thumb:
        'Plan doc says YouTube API ~50 channels/account/day; 17 channels ≈ ~34% of one daily account budget if 1 channel ≈ 1 unit.',
    },
    null,
    2
  )
);
