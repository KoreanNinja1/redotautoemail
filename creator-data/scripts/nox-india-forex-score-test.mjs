#!/usr/bin/env node
/**
 * @deprecated Use nox-discovery-queue.mjs with a JSON config instead.
 * Nox India forex sample → KOL Intelligence RAS scoring test.
 * Usage: node nox-india-forex-score-test.mjs [count]
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const count = Number(process.argv[2] || 20);
const followerMin = 4000;
const followerMax = 100000;

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

function runNox(args) {
  return JSON.parse(execFileSync('noxinfluencer', args, { encoding: 'utf8' }));
}

function extractChannelId(url) {
  const m = String(url || '').match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  return m ? m[1] : '';
}

function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}

function normName(n) {
  return String(n || '').trim().toLowerCase();
}

const outreachPath =
  '/Users/kennyyifeichen/Downloads/RedotPay-KOL-BD/creator-data/master/outreach_do_not_contact.csv';
const outreachEmails = new Set();
const outreachChannelIds = new Set();
const outreachNames = new Set();
const outreachHandles = new Set();

for (const line of fs.readFileSync(outreachPath, 'utf8').trim().split(/\r?\n/).slice(1)) {
  const c = line.match(/("([^"]|"")*"|[^,]*)/g)?.map((x) => x.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
  const name = normName(c[0]);
  if (name) outreachNames.add(name);
  const e = normEmail(c[5]);
  if (e) outreachEmails.add(e);
  const cid = extractChannelId(c[3]);
  if (cid) outreachChannelIds.add(cid);
  const yk = c[4] || '';
  if (yk.startsWith('channel:')) outreachChannelIds.add(yk.slice(8));
  if (yk.startsWith('@')) outreachHandles.add(yk.toLowerCase());
  const hm = String(c[3] || '').match(/youtube\.com\/@([\w.-]+)/i);
  if (hm) outreachHandles.add(`@${hm[1].toLowerCase()}`);
}

function inOutreach({ channelName, channelId, email, profileUrl }) {
  if (email && outreachEmails.has(normEmail(email))) return 'email';
  if (channelId && outreachChannelIds.has(channelId)) return 'channel_id';
  if (normName(channelName) && outreachNames.has(normName(channelName))) return 'name';
  const handleMatch = String(profileUrl || '').match(/youtube\.com\/@([\w.-]+)/i);
  if (handleMatch && outreachHandles.has(`@${handleMatch[1].toLowerCase()}`)) return 'handle';
  return '';
}

function esc(v) {
  const s = String(v ?? '').replace(/\r?\n/g, ' ').trim();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchSnapshot(channelId) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${BASE}/api/channels/${channelId}/snapshot`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    if (res.ok) return { status: res.status, data: await res.json() };
    if ([524, 502, 503, 429].includes(res.status) && attempt < 3) {
      await sleep(1000 * attempt);
      continue;
    }
    return { status: res.status, data: null };
  }
}

const search = runNox([
  'creator',
  'search',
  '--platform',
  'youtube',
  '--keywords',
  '["forex"]',
  '--country',
  '["IN"]',
  '--follower_min',
  String(followerMin),
  '--follower_max',
  String(followerMax),
  '--has_email',
  'true',
  '--page_size',
  '20',
]);

let items = search.data?.items || [];
if (items.length < count) {
  const search2 = runNox([
    'creator',
    'search',
    '--platform',
    'youtube',
    '--keywords',
    '["forex"]',
    '--country',
    '["IN"]',
    '--follower_min',
    String(followerMin),
    '--follower_max',
    String(followerMax),
    '--page_size',
    '20',
    '--page_num',
    '2',
    '--search_after',
    JSON.stringify(search.data?.search_after || []),
  ]);
  items = [...items, ...(search2.data?.items || [])];
}
items = items.slice(0, count * 2);

const rows = [];
let skippedOutreach = 0;
for (const item of items) {
  let profile = null;
  let channelId = '';
  let profileUrl = '';
  let email = '';
  try {
    profile = runNox(['creator', 'profile', item.id]);
    const d = profile.data || {};
    profileUrl = d.channel_url || d.url || '';
    channelId = extractChannelId(profileUrl) || d.channel_id || d.youtube_channel_id || '';
    if (!profileUrl && channelId) {
      profileUrl = `https://www.youtube.com/channel/${channelId}`;
    }
    email = d.email || d.contact_email || '';
  } catch {
    // profile failed
  }

  const outreachHit = inOutreach({
    channelName: item.nickname,
    channelId,
    email,
    profileUrl,
  });
  if (outreachHit) {
    skippedOutreach++;
    continue;
  }
  if (rows.length >= count) continue;

  let ras = null;
  let verdict = '';
  let category = '';
  let inKolDb = 'no';
  let scoreNote = '';

  if (channelId) {
    const snap = await fetchSnapshot(channelId);
    if (snap.status === 200 && snap.data) {
      const d = snap.data;
      ras = d.score_100 ?? d.score ?? d.metrics?.score_100 ?? null;
      verdict = d.verdict || '';
      category = d.input?.category || d.category || '';
      inKolDb = ras != null ? 'yes' : 'partial';
      if (ras == null) scoreNote = 'snapshot_ok_no_score';
    } else if (snap.status === 404) {
      inKolDb = 'no';
      scoreNote = 'not_in_kol_db';
    } else {
      scoreNote = `api_${snap.status}`;
    }
    await sleep(250);
  } else {
    scoreNote = 'no_youtube_channel_id';
  }

  rows.push({
    nox_creator_id: item.id,
    channel_name: item.nickname,
    channel_id: channelId,
    profile_url: profileUrl,
    country: item.country,
    subscribers: item.followers,
    language: item.language,
    avg_views: item.avg_views,
    engagement_rate: item.engagement_rate,
    nox_tags: (item.tags || []).join('; '),
    nox_email_signal: email ? 'profile_email' : 'has_email_search',
    ras_score: ras ?? '',
    bd_verdict: verdict,
    category,
    in_kol_intelligence: inKolDb,
    score_status: scoreNote,
    in_outreach: 'no',
    data_source: 'noxinfluencer+kol-intelligence-test',
  });
}

if (rows.length < count) {
  process.stderr.write(`warning: only ${rows.length}/${count} after outreach dedupe\n`);
}

rows.sort((a, b) => (Number(b.ras_score) || 0) - (Number(a.ras_score) || 0));

const header = Object.keys(rows[0] || {});
const masterDir = '/Users/kennyyifeichen/Downloads/RedotPay-KOL-BD/creator-data/master';
fs.mkdirSync(masterDir, { recursive: true });
const date = new Date().toISOString().slice(0, 10);
const outPath = path.join(masterDir, `india_forex_nox_score_test_${date}.csv`);
fs.writeFileSync(
  outPath,
  [header.join(','), ...rows.map((r) => header.map((h) => esc(r[h])).join(','))].join('\n') + '\n'
);

const summary = {
  requested: count,
  exported: rows.length,
      follower_range: `${followerMin}-${followerMax}`,
      skipped_in_outreach: skippedOutreach,
      in_kol_db_with_score: rows.filter((r) => r.in_kol_intelligence === 'yes').length,
  not_in_kol_db: rows.filter((r) => r.score_status === 'not_in_kol_db').length,
  no_channel_id: rows.filter((r) => r.score_status === 'no_youtube_channel_id').length,
  file: outPath,
  top_scored: rows
    .filter((r) => r.ras_score !== '')
    .slice(0, 5)
    .map((r) => ({ name: r.channel_name, ras: r.ras_score, verdict: r.bd_verdict })),
};
console.log(JSON.stringify(summary, null, 2));
