#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ENV_FILE = '/Users/kennyyifeichen/Downloads/.agents/skills/redotpay-youtube-kol-intelligence/.env.local';
const env = Object.fromEntries(
  fs.readFileSync(ENV_FILE, 'utf8').trim().split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
);
const BASE = env.YTK_BASE_URL || 'https://kol.redotpay.club';
const KEY = env.YTK_API_KEY;
if (!KEY) {
  console.error('No API key');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiGet(p, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE}${p}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    if (res.ok) return res.json();
    const retryable = res.status === 524 || res.status === 502 || res.status === 503 || res.status === 429;
    if (!retryable || attempt === retries) {
      throw new Error(`${p} -> ${res.status}`);
    }
    await sleep(1500 * attempt);
  }
  throw new Error(`${p} -> exhausted retries`);
}

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

function esc(v) {
  const s = String(v ?? '').replace(/\r?\n/g, ' ').trim();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}

function extractChannelId(urlOrId) {
  const s = String(urlOrId || '');
  const m = s.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (m) return m[1];
  if (/^UC[\w-]{20,}$/.test(s)) return s;
  return '';
}

function normHandle(h) {
  const s = String(h || '').trim().toLowerCase();
  if (!s) return '';
  return s.startsWith('@') ? s : `@${s}`;
}

const outreachPath =
  '/Users/kennyyifeichen/Downloads/RedotPay-KOL-BD/creator-data/master/outreach_do_not_contact.csv';
const outreachLines = fs.readFileSync(outreachPath, 'utf8').trim().split(/\r?\n/).slice(1);
const outreachEmails = new Set();
const outreachChannelIds = new Set();
const outreachHandles = new Set();

for (const line of outreachLines) {
  const cols = parseCsvLine(line);
  const email = normEmail(cols[5]);
  if (email) outreachEmails.add(email);
  const url = cols[3] || '';
  const cid = extractChannelId(url);
  if (cid) outreachChannelIds.add(cid);
  const yk = cols[4] || '';
  if (yk.startsWith('channel:')) outreachChannelIds.add(yk.slice(8));
  if (yk.startsWith('@')) outreachHandles.add(yk.toLowerCase());
}

function inOutreach(item, email) {
  if (email && outreachEmails.has(email)) return 'email';
  if (item.channel_id && outreachChannelIds.has(item.channel_id)) return 'channel_id';
  const h = normHandle(item.handle);
  if (h && outreachHandles.has(h)) return 'handle';
  return '';
}

const limit = 100;
let offset = 0;
let total = Infinity;
const all = [];

while (offset < total) {
  const j = await apiGet(`/api/kols?limit=${limit}&offset=${offset}&score_min=50`);
  total = j.total ?? 0;
  if (!j.items?.length) break;
  all.push(...j.items);
  offset += j.items.length;
  process.stderr.write(`fetched ${all.length}/${total}\n`);
  if (j.items.length < limit) break;
  await sleep(300);
}

const MVP_MARKETS = new Set([
  'Pakistan',
  'Egypt',
  'Algeria',
  'Saudi Arabia',
  'Bangladesh',
  'Nigeria',
  'United Arab Emirates',
  'UAE',
  'Morocco',
  'Tunisia',
  'Jordan',
  'Lebanon',
  'Iraq',
  'Kuwait',
  'Qatar',
  'Oman',
  'Bahrain',
]);
const DEFER_MARKETS = new Set(['India']);
const SA_MARKETS = new Set([
  'Brazil',
  'Argentina',
  'Colombia',
  'Chile',
  'Peru',
  'Mexico',
  'Venezuela',
  'Ecuador',
]);

const header = [
  'channel_name',
  'channel_id',
  'profile_url',
  'market',
  'country',
  'subscribers',
  'ras_score',
  'bd_verdict',
  'category',
  'tags',
  'content_topic',
  'email',
  'contact_status',
  'email_action',
  'comment_score',
  'purchase_intent_score',
  'avg_views',
  'latest_video_at',
  'in_outreach',
  'market_bucket',
  'data_source',
  'last_exported',
];

const rows = [];
let skippedInOutreach = 0;

for (const item of all) {
  const email = normEmail(item.contact?.email);
  const contactStatus = item.contact?.status || 'unchecked';
  const outreachHit = inOutreach(item, email);
  if (outreachHit) {
    skippedInOutreach++;
    continue;
  }

  const hasEmail = contactStatus === 'found' && !!email;

  let marketBucket = 'other';
  if (DEFER_MARKETS.has(item.market)) marketBucket = 'india_defer';
  else if (MVP_MARKETS.has(item.market)) marketBucket = 'mvp';
  else if (SA_MARKETS.has(item.market)) marketBucket = 'south_america_q3';

  const handle = item.handle
    ? item.handle.startsWith('@')
      ? item.handle
      : `@${item.handle}`
    : '';
  const profileUrl = item.channel_id
    ? `https://www.youtube.com/channel/${item.channel_id}`
    : handle
      ? `https://www.youtube.com/${handle}`
      : '';

  let emailAction = 'ready_for_lark';
  if (!hasEmail) {
    emailAction =
      contactStatus === 'error' ? 'retry_noxin_contact' : 'find_via_noxin_or_manual';
  }

  rows.push([
    item.title,
    item.channel_id,
    profileUrl,
    item.market,
    item.country,
    item.subscriber_count,
    item.score,
    item.verdict,
    item.category,
    (item.tags || '').replace(/,/g, '; '),
    item.category || (item.tags || '').split(',')[0] || '',
    hasEmail ? email : '',
    contactStatus,
    emailAction,
    item.comment_overall_score ?? '',
    item.comment_purchase_intent_score ?? '',
    item.avg_views ?? '',
    item.latest_video_at ?? '',
    'no',
    marketBucket,
    'kol-intelligence-api',
    new Date().toISOString().slice(0, 10),
  ]);
}

const bucketOrder = { mvp: 0, other: 1, south_america_q3: 2, india_defer: 3 };
rows.sort((a, b) => {
  const ba = bucketOrder[a[19]] ?? 9;
  const bb = bucketOrder[b[19]] ?? 9;
  if (ba !== bb) return ba - bb;
  if ((a[12] === 'found') !== (b[12] === 'found')) return a[12] === 'found' ? -1 : 1;
  return (Number(b[6]) || 0) - (Number(a[6]) || 0);
});

const masterDir = '/Users/kennyyifeichen/Downloads/RedotPay-KOL-BD/creator-data/master';
fs.mkdirSync(masterDir, { recursive: true });
const date = new Date().toISOString().slice(0, 10);

function writeCsv(filePath, dataRows) {
  const content =
    [header.join(','), ...dataRows.map((r) => r.map(esc).join(','))].join('\n') + '\n';
  fs.writeFileSync(filePath, content, 'utf8');
  return dataRows.length;
}

const allPath = path.join(masterDir, `kol_intelligence_all_${date}.csv`);
const mvpPath = path.join(masterDir, `kol_intelligence_mvp_${date}.csv`);
const needEmailPath = path.join(masterDir, `kol_intelligence_needs_email_${date}.csv`);
const readyPath = path.join(masterDir, `kol_intelligence_ready_email_${date}.csv`);

const mvpRows = rows.filter((r) => r[19] === 'mvp');
const needEmailRows = rows.filter((r) => r[13] !== 'ready_for_lark');
const readyRows = rows.filter((r) => r[13] === 'ready_for_lark');

writeCsv(allPath, rows);
writeCsv(mvpPath, mvpRows);
writeCsv(needEmailPath, needEmailRows);
writeCsv(readyPath, readyRows);

const byMarket = {};
for (const r of rows) {
  const m = r[3] || '(unknown)';
  if (!byMarket[m]) byMarket[m] = { total: 0, has_email: 0, no_email: 0 };
  byMarket[m].total++;
  if (r[13] === 'ready_for_lark') byMarket[m].has_email++;
  else byMarket[m].no_email++;
}

console.log(
  JSON.stringify(
    {
      api_total_scored_50plus: all.length,
      after_outreach_dedupe: rows.length,
      skipped_in_outreach: skippedInOutreach,
      has_email_ready: readyRows.length,
      needs_email: needEmailRows.length,
      mvp_market_count: mvpRows.length,
      mvp_has_email: mvpRows.filter((r) => r[13] === 'ready_for_lark').length,
      mvp_needs_email: mvpRows.filter((r) => r[13] !== 'ready_for_lark').length,
      files: { allPath, mvpPath, needEmailPath, readyPath },
      top_markets: Object.entries(byMarket)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 12)
        .map(([k, v]) => ({ market: k, ...v })),
    },
    null,
    2
  )
);
