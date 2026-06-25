#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { PATHS } from './paths.mjs';
import { esc, inDedupeSet, loadOutreach, loadRasBlacklist } from './dedupe.mjs';

const market = process.argv[2] || 'Saudi Arabia';
const scoreMin = process.argv[3] || '60';
const slug = market.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

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
const BASE = env.YTK_BASE_URL || 'https://kol.redotpay.club';
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

function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}

const outreach = loadOutreach();
const rasBlacklist = loadRasBlacklist();

async function apiGet(p) {
  const r = await fetch(`${BASE}${p}`, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`${p} ${r.status}`);
  return r.json();
}

const j = await apiGet(
  `/api/kols?market=${encodeURIComponent(market)}&limit=100&score_min=${scoreMin}`
);
const items = (j.items || [])
  .filter((it) => {
    const email = normEmail(it.contact?.email);
    const channelId = it.channel_id || '';
    if (inDedupeSet(outreach, { channelName: it.title, channelId, email, profileUrl: '' })) return false;
    if (inDedupeSet(rasBlacklist, { channelName: it.title, channelId, email, profileUrl: '' })) return false;
    return true;
  })
  .sort((a, b) => (b.score || 0) - (a.score || 0));

const header = [
  'priority_rank',
  'channel_name',
  'channel_id',
  'profile_url',
  'market',
  'country',
  'subscribers',
  'ras_score',
  'bd_verdict',
  'category',
  'email',
  'contact_status',
  'email_action',
  'comment_score',
  'outreach_status',
  'reply_status',
  'last_contact_date',
  'next_followup_date',
  'notes',
];

const rows = items.map((it, idx) => {
  const email = normEmail(it.contact?.email);
  const hasEmail = it.contact?.status === 'found' && !!email;
  return [
    idx + 1,
    it.title,
    it.channel_id,
    `https://www.youtube.com/channel/${it.channel_id}`,
    it.market,
    it.country,
    it.subscriber_count,
    it.score,
    it.verdict,
    it.category,
    hasEmail ? email : '',
    it.contact?.status || 'unchecked',
    hasEmail ? 'ready_for_lark' : 'find_via_noxin_or_manual',
    it.comment_overall_score ?? '',
    'not_contacted',
    '',
    '',
    '',
    '',
  ];
});

const queuesDir = PATHS.queues;
fs.mkdirSync(queuesDir, { recursive: true });
const outPath = path.join(queuesDir, `kol_queue_${slug}.csv`);
fs.writeFileSync(
  outPath,
  [header.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n') + '\n'
);

console.log(
  JSON.stringify(
    {
      market,
      api_total: j.total,
      after_outreach: rows.length,
      with_email: rows.filter((r) => r[12] === 'ready_for_lark').length,
      without_email: rows.filter((r) => r[12] !== 'ready_for_lark').length,
      file: outPath,
      queue: rows.map((r) => ({
        rank: r[0],
        name: r[1],
        score: r[7],
        verdict: r[8],
        email: r[10] || null,
        email_action: r[12],
      })),
    },
    null,
    2
  )
);
