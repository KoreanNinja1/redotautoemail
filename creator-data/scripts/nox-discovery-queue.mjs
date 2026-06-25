#!/usr/bin/env node
/**
 * Config-driven Nox discovery → outreach dedupe → optional contacts/RAS → CSV.
 * Paginates until `count` rows after dedupe (or pool exhausted).
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { PATHS } from './paths.mjs';
import { esc, extractChannelId, inDedupeSet, loadOutreach, loadRasBlacklist } from './dedupe.mjs';

const configPath = process.argv[2];
if (!configPath || !fs.existsSync(configPath)) {
  console.error('Usage: node nox-discovery-queue.mjs <config.json>');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const platform = cfg.platform || 'youtube';
const countries = (cfg.countries || ['IN']).map((c) => String(c).toUpperCase());
const keywords = cfg.keywords || ['forex'];
const followerMin = cfg.follower_min ?? 4000;
const followerMax = cfg.follower_max ?? 100000;
const count = cfg.count ?? 20;
const hasEmail = cfg.has_email !== false;
const fetchContacts = cfg.fetch_contacts !== false && hasEmail;
const excludeOutreach = cfg.exclude_outreach !== false;
const excludeUnsupported = cfg.exclude_unsupported !== false;
const strictCountry = cfg.strict_country !== false;
const excludeRasBlacklist = cfg.exclude_ras_blacklist !== false;
const kolScore = cfg.kol_intelligence_score === true;
const outputSlug = cfg.output_slug || 'nox_queue';

const ENV_FILE = PATHS.kolEnv;

function runNox(args) {
  return JSON.parse(execFileSync('noxinfluencer', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
}

function loadUnsupported() {
  const set = new Set();
  if (!excludeUnsupported || !fs.existsSync(PATHS.unsupported)) return set;
  for (const line of fs.readFileSync(PATHS.unsupported, 'utf8').trim().split(/\r?\n/).slice(1)) {
    const c = line.trim();
    if (c) set.add(c.toLowerCase());
  }
  return set;
}

function buildSearchArgs(pageNum, searchAfter) {
  const args = [
    'creator', 'search',
    '--platform', platform,
    '--keywords', JSON.stringify(keywords),
    '--country', JSON.stringify(countries),
    '--follower_min', String(followerMin),
    '--follower_max', String(followerMax),
    '--page_size', '20',
    '--page_num', String(pageNum),
  ];
  if (hasEmail) args.push('--has_email', 'true');
  if (cfg.avg_view_min != null) args.push('--avg_view_min', String(cfg.avg_view_min));
  if (cfg.published_within_days != null) args.push('--published_within_days', String(cfg.published_within_days));
  if (cfg.engagement_rate_min != null) args.push('--engagement_rate_min', String(cfg.engagement_rate_min));
  if (pageNum > 1 && searchAfter) args.push('--search_after', JSON.stringify(searchAfter));
  return args;
}

function noxProfile(creatorId) {
  return runNox(['creator', 'profile', '--', creatorId]);
}

function noxContacts(creatorId) {
  return runNox(['creator', 'contacts', '--', creatorId]);
}

function pickEmail(contactsData) {
  const d = contactsData?.data || {};
  if (d.email) return d.email;
  const list = d.contacts || d.contact_list || [];
  for (const c of list) {
    const t = String(c.type || c.contact_type || '').toLowerCase();
    if (t.includes('email') && c.value) return c.value;
  }
  return '';
}

const outreach = excludeOutreach ? loadOutreach() : { emails: new Set(), channelIds: new Set(), names: new Set(), handles: new Set() };
const rasBlacklist = excludeRasBlacklist ? loadRasBlacklist() : { emails: new Set(), channelIds: new Set(), names: new Set(), handles: new Set() };
const unsupported = loadUnsupported();

let kolEnv = null;
if (kolScore && fs.existsSync(ENV_FILE)) {
  kolEnv = Object.fromEntries(
    fs.readFileSync(ENV_FILE, 'utf8').trim().split('\n').filter((l) => l && !l.startsWith('#')).map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
  );
}

async function fetchSnapshot(channelId) {
  if (!kolEnv) return { status: 0, data: null };
  const res = await fetch(`${kolEnv.YTK_BASE_URL}/api/channels/${channelId}/snapshot`, {
    headers: { Authorization: `Bearer ${kolEnv.YTK_API_KEY}` },
  });
  if (res.ok) return { status: res.status, data: await res.json() };
  return { status: res.status, data: null };
}

const rows = [];
const seenNoxIds = new Set();
let skippedOutreach = 0;
let skippedRasBlacklist = 0;
let skippedUnsupported = 0;
let skippedCountry = 0;
let skippedNoEmail = 0;
let page = 1;
let searchAfter = null;
let totalPages = Infinity;
let profilesFetched = 0;
let contactsFetched = 0;

while (rows.length < count && page <= totalPages && page <= 30) {
  const search = runNox(buildSearchArgs(page, searchAfter));
  const batch = search.data?.items || [];
  totalPages = search.data?.total_page || page;
  if (!batch.length) break;

  for (const item of batch) {
    if (rows.length >= count) break;
    if (seenNoxIds.has(item.id)) continue;
    seenNoxIds.add(item.id);

    if (strictCountry && item.country && !countries.includes(String(item.country).toUpperCase())) {
      skippedCountry++;
      continue;
    }

    if (excludeUnsupported && item.country && unsupported.has(String(item.country).toLowerCase())) {
      skippedUnsupported++;
      continue;
    }

    let channelId = '';
    let profileUrl = '';
    let email = '';
    try {
      const profile = noxProfile(item.id);
      profilesFetched++;
      const d = profile.data || {};
      profileUrl = d.channel_url || d.url || '';
      channelId = extractChannelId(profileUrl) || d.channel_id || '';
      if (!profileUrl && channelId) profileUrl = `https://www.youtube.com/channel/${channelId}`;
      email = d.email || d.contact_email || '';
    } catch {
      continue;
    }

    if (fetchContacts && !email) {
      try {
        const contacts = noxContacts(item.id);
        contactsFetched++;
        email = pickEmail(contacts);
      } catch {
        // no visible email
      }
    }

    if (hasEmail && !email) {
      skippedNoEmail++;
      continue;
    }

    const outreachHit = excludeOutreach
      ? inDedupeSet(outreach, { channelName: item.nickname, channelId, email, profileUrl })
      : '';
    if (outreachHit) {
      skippedOutreach++;
      continue;
    }

    const rasHit = excludeRasBlacklist
      ? inDedupeSet(rasBlacklist, { channelName: item.nickname, channelId, email, profileUrl })
      : '';
    if (rasHit) {
      skippedRasBlacklist++;
      continue;
    }

    let ras = '';
    let verdict = '';
    let scoreStatus = kolScore ? 'not_checked' : '';
    if (kolScore && channelId) {
      const snap = await fetchSnapshot(channelId);
      if (snap.status === 200 && snap.data) {
        ras = snap.data.score_100 ?? snap.data.score ?? '';
        verdict = snap.data.verdict || '';
        scoreStatus = ras !== '' ? 'scored' : 'not_in_kol_db';
      } else {
        scoreStatus = 'not_in_kol_db';
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    rows.push({
      channel_name: item.nickname,
      channel_id: channelId,
      profile_url: profileUrl,
      country: item.country,
      subscribers: item.followers,
      avg_views: item.avg_views,
      engagement_rate: item.engagement_rate,
      language: item.language,
      email,
      email_source: email ? (fetchContacts ? 'nox_contacts' : 'nox_profile') : '',
      ras_score: ras,
      bd_verdict: verdict,
      score_status: scoreStatus,
      in_outreach: 'no',
      filters_used: JSON.stringify({
        keywords,
        countries,
        follower_min: followerMin,
        follower_max: followerMax,
        has_email: hasEmail,
        fetch_contacts: fetchContacts,
        published_within_days: cfg.published_within_days ?? null,
        avg_view_min: cfg.avg_view_min ?? null,
        strict_country: strictCountry,
      }),
      data_source: 'noxinfluencer',
    });
  }

  searchAfter = search.data?.search_after;
  if (!searchAfter || page >= totalPages) break;
  page++;
}

rows.sort((a, b) => (Number(b.avg_views) || 0) - (Number(a.avg_views) || 0) || (b.subscribers || 0) - (a.subscribers || 0));
rows.forEach((r, i) => { r.priority_rank = i + 1; });

const queuesDir = PATHS.queues;
fs.mkdirSync(queuesDir, { recursive: true });
const date = new Date().toISOString().slice(0, 10);
const outPath = path.join(queuesDir, `nox_queue_${outputSlug}_${date}.csv`);
const header = rows.length ? Object.keys(rows[0]) : ['priority_rank', 'channel_name'];
fs.writeFileSync(outPath, [header.join(','), ...rows.map((r) => header.map((h) => esc(r[h])).join(','))].join('\n') + '\n');

console.log(JSON.stringify({
  config: configPath,
  label: cfg.label || outputSlug,
  requested: count,
  exported: rows.length,
  pages_scanned: page,
  candidates_seen: seenNoxIds.size,
  skipped_outreach: skippedOutreach,
  skipped_ras_blacklist: skippedRasBlacklist,
  skipped_unsupported: skippedUnsupported,
  skipped_country: skippedCountry,
  skipped_no_visible_email: skippedNoEmail,
  profiles_fetched: profilesFetched,
  contacts_fetched: contactsFetched,
  with_email: rows.filter((r) => r.email).length,
  file: outPath,
  names: rows.map((r) => ({ rank: r.priority_rank, name: r.channel_name, email: r.email || null, subs: r.subscribers, avg_views: r.avg_views })),
}, null, 2));

if (rows.length < count) {
  process.exitCode = 1;
}
