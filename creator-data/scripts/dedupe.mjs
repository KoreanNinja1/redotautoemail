import fs from 'fs';
import { PATHS } from './paths.mjs';

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

export function extractChannelId(url) {
  const m = String(url || '').match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  return m ? m[1] : '';
}

export function loadOutreach() {
  const emails = new Set();
  const channelIds = new Set();
  const names = new Set();
  const handles = new Set();
  if (!fs.existsSync(PATHS.outreach)) return { emails, channelIds, names, handles };
  for (const line of fs.readFileSync(PATHS.outreach, 'utf8').trim().split(/\r?\n/).slice(1)) {
    const c = parseCsvLine(line);
    const name = (c[0] || '').trim().toLowerCase();
    if (name) names.add(name);
    const e = (c[5] || '').trim().toLowerCase();
    if (e) emails.add(e);
    const cid = extractChannelId(c[3]);
    if (cid) channelIds.add(cid);
    const yk = c[4] || '';
    if (yk.startsWith('channel:')) channelIds.add(yk.slice(8));
    if (yk.startsWith('@')) handles.add(yk.toLowerCase());
    const hm = String(c[3] || '').match(/youtube\.com\/@([\w.-]+)/i);
    if (hm) handles.add(`@${hm[1].toLowerCase()}`);
  }
  return { emails, channelIds, names, handles };
}

export function loadRasBlacklist() {
  const emails = new Set();
  const channelIds = new Set();
  const names = new Set();
  if (!fs.existsSync(PATHS.rasBelow60)) return { emails, channelIds, names, handles: new Set() };
  const hdr = parseCsvLine(fs.readFileSync(PATHS.rasBelow60, 'utf8').trim().split(/\r?\n/)[0]);
  const idx = Object.fromEntries(hdr.map((h, i) => [h, i]));
  for (const line of fs.readFileSync(PATHS.rasBelow60, 'utf8').trim().split(/\r?\n/).slice(1)) {
    const c = parseCsvLine(line);
    const name = (c[idx.channel_name] || '').trim().toLowerCase();
    if (name) names.add(name);
    const e = (c[idx.email] || '').trim().toLowerCase();
    if (e) emails.add(e);
    const cid = c[idx.channel_id] || extractChannelId(c[idx.profile_url]);
    if (cid) channelIds.add(cid);
  }
  return { emails, channelIds, names, handles: new Set() };
}

export function inDedupeSet(hit, { channelName, channelId, email, profileUrl }) {
  if (email && hit.emails.has(email.trim().toLowerCase())) return 'email';
  if (channelId && hit.channelIds.has(channelId)) return 'channel_id';
  if ((channelName || '').trim().toLowerCase() && hit.names.has(channelName.trim().toLowerCase())) return 'name';
  const hm = String(profileUrl || '').match(/youtube\.com\/@([\w.-]+)/i);
  if (hm && hit.handles?.has(`@${hm[1].toLowerCase()}`)) return 'handle';
  return '';
}

export function esc(v) {
  const s = String(v ?? '').replace(/\r?\n/g, ' ').trim();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function isContactable(ras, verdict) {
  if (verdict === 'Exclude') return false;
  const n = Number(ras);
  return Number.isFinite(n) && n >= 60;
}

/** Country code for sorting (IN, BR, …). */
export function rowCountry(r) {
  return (r.country || r.market || 'UNKNOWN').trim().toUpperCase();
}

/** Primary sort: country A→Z, then RAS desc, then subscribers desc. */
export function compareByCountryThenScore(a, b) {
  const countryCmp = rowCountry(a).localeCompare(rowCountry(b));
  if (countryCmp) return countryCmp;
  const scoreDiff = (Number(b.ras_score) || 0) - (Number(a.ras_score) || 0);
  if (scoreDiff) return scoreDiff;
  return (Number(b.subscribers) || 0) - (Number(a.subscribers) || 0);
}

export function compareByScoreDesc(a, b) {
  const scoreDiff = (Number(b.ras_score) || 0) - (Number(a.ras_score) || 0);
  if (scoreDiff) return scoreDiff;
  return (Number(b.subscribers) || 0) - (Number(a.subscribers) || 0);
}

/** Sort in place; reassign priority_rank 1..n. */
export function sortRasResults(rows) {
  rows.sort(compareByCountryThenScore);
  rows.forEach((r, i) => {
    r.priority_rank = String(i + 1);
  });
  return rows;
}

export function appendRasBlacklist(rows, { sourceBatch, date = new Date().toISOString().slice(0, 10) }) {
  const blHdr = 'channel_name,channel_id,profile_url,email,ras_score,bd_verdict,reason,source_batch,added_date';
  const blPath = PATHS.rasBelow60;
  const existing = new Set();
  if (fs.existsSync(blPath)) {
    for (const line of fs.readFileSync(blPath, 'utf8').trim().split(/\r?\n/).slice(1)) {
      const c = parseCsvLine(line);
      if (c[1]) existing.add(c[1]);
    }
  } else {
    fs.writeFileSync(blPath, `${blHdr}\n`);
  }
  const toAdd = rows.filter((r) => r.channel_id && !existing.has(r.channel_id));
  if (!toAdd.length) return 0;
  fs.appendFileSync(
    blPath,
    toAdd
      .map((r) =>
        [
          r.channel_name,
          r.channel_id,
          r.profile_url,
          r.email,
          r.ras_score,
          r.bd_verdict,
          'ras_below_60',
          sourceBatch,
          date,
        ]
          .map(esc)
          .join(',')
      )
      .join('\n') + '\n'
  );
  return toAdd.length;
}
