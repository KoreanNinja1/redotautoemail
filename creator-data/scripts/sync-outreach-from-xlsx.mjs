#!/usr/bin/env node
/**
 * Rebuild outreach_do_not_contact.csv from Outreach xlsx export.
 * Usage: node sync-outreach-from-xlsx.mjs <path-to.xlsx>
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { PATHS, PROJECT } from './paths.mjs';
import { esc, extractChannelId, inDedupeSet, loadRasBlacklist } from './dedupe.mjs';

const xlsxPath = process.argv[2];
if (!xlsxPath || !fs.existsSync(xlsxPath)) {
  console.error('Usage: node sync-outreach-from-xlsx.mjs <outreach.xlsx>');
  process.exit(1);
}

const tmpDir = path.join(PROJECT, 'creator-data/.tmp_outreach_sync');
const blacklistsDir = path.join(PROJECT, 'creator-data/blacklists');

function parseSharedStrings(xml) {
  const out = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    out.push(
      [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((x) => x[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#xA;/g, '\n'))
        .join('')
    );
  }
  return out;
}

function colToIdx(col) {
  let n = 0;
  for (const c of col) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

function parseSheet(xml, ss) {
  const rows = new Map();
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const cells = {};
    const cellRe = /<c[^>]*r="([A-Z]+)(\d+)"([^>]*)>(?:<v>([\s\S]*?)<\/v>)?/g;
    let cm;
    while ((cm = cellRe.exec(rm[2]))) {
      let val = cm[4] ?? '';
      if (cm[3].includes('t="s"')) val = ss[+val] ?? '';
      cells[colToIdx(cm[1])] = val;
    }
    const maxCol = Math.max(0, ...Object.keys(cells).map(Number));
    const arr = [];
    for (let i = 1; i <= maxCol; i++) arr.push(String(cells[i] ?? '').trim());
    rows.set(+rm[1], arr);
  }
  return rows;
}

function youtubeKey(profileUrl, handleCol) {
  const h = String(handleCol || '').trim();
  if (h.startsWith('@')) return h;
  if (h.startsWith('channel:')) return h;
  const cid = extractChannelId(profileUrl);
  if (cid) return `channel:${cid}`;
  const hm = String(profileUrl).match(/youtube\.com\/@([\w.-]+)/i);
  if (hm) return `@${hm[1]}`;
  return h;
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

function readCsv(filePath) {
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

fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
execSync(`unzip -qo "${xlsxPath}" -d "${tmpDir}"`);

const ss = parseSharedStrings(fs.readFileSync(path.join(tmpDir, 'xl/sharedStrings.xml'), 'utf8'));
const sheet = parseSheet(fs.readFileSync(path.join(tmpDir, 'xl/worksheets/sheet1.xml'), 'utf8'), ss);
const rawRows = [...sheet.values()].filter((r) => r[0]);

const outreachHdr =
  'channel_name,country,platform,profile_url,youtube_key,email,cooperation_status,onboard_status,bd_owner,uid,notes,do_not_contact';
const outreachRows = [];
const seen = new Set();

for (const r of rawRows) {
  const channel_name = r[0] || '';
  const country = r[2] || '';
  const platform = r[3] || '';
  const profile_url = (r[4] || '').split('\n')[0].trim();
  const email = (r[8] || '').trim();
  const cooperation_status = r[10] || '';
  const bd_owner = r[11] || '';
  const uid = r[13] || '';
  const onboard_status = r[14] || '';
  const notes = r[16] || '';
  const youtube_key = youtubeKey(profile_url, r[6]);
  const channel_id = extractChannelId(profile_url) || (youtube_key.startsWith('channel:') ? youtube_key.slice(8) : '');

  const keys = [
    channel_name.toLowerCase(),
    email.toLowerCase(),
    channel_id,
    youtube_key.toLowerCase(),
  ].filter(Boolean);
  if (keys.some((k) => seen.has(k))) continue;
  keys.forEach((k) => seen.add(k));

  outreachRows.push({
    channel_name,
    country,
    platform,
    profile_url,
    youtube_key,
    email,
    cooperation_status,
    onboard_status,
    bd_owner,
    uid,
    notes,
    do_not_contact: 'yes',
  });
}

fs.mkdirSync(blacklistsDir, { recursive: true });
fs.copyFileSync(xlsxPath, path.join(blacklistsDir, path.basename(xlsxPath)));
fs.writeFileSync(
  PATHS.outreach,
  [outreachHdr, ...outreachRows.map((r) => outreachHdr.split(',').map((h) => esc(r[h])).join(','))].join('\n') + '\n'
);

// Dedupe all_ready.csv
const readyPath = path.join(PATHS.queues, 'batches/results/all_ready.csv');
const readyBackup = readyPath.replace('.csv', '_before_outreach_sync.csv');
if (fs.existsSync(readyPath)) fs.copyFileSync(readyPath, readyBackup);

const outreachHit = {
  emails: new Set(),
  channelIds: new Set(),
  names: new Set(),
  handles: new Set(),
};
for (const r of outreachRows) {
  if (r.email) outreachHit.emails.add(r.email.toLowerCase());
  if (r.channel_name) outreachHit.names.add(r.channel_name.toLowerCase());
  const cid = extractChannelId(r.profile_url) || (r.youtube_key.startsWith('channel:') ? r.youtube_key.slice(8) : '');
  if (cid) outreachHit.channelIds.add(cid);
  if (r.youtube_key.startsWith('@')) outreachHit.handles.add(r.youtube_key.toLowerCase());
}
const rasHit = loadRasBlacklist();

const { header: readyHdr, rows: readyRows } = readCsv(readyPath);
const internalSeen = new Set();
const clean = [];
const dupReport = [];

for (const r of readyRows) {
  const cid = r.channel_id || extractChannelId(r.profile_url);
  const email = (r.email || '').trim().toLowerCase();
  const name = (r.channel_name || '').trim().toLowerCase();
  const ikey = cid || email || name;
  const reasons = [];

  if (ikey && internalSeen.has(ikey)) reasons.push('internal_duplicate');
  if (inDedupeSet(outreachHit, { channelName: r.channel_name, channelId: cid, email: r.email, profileUrl: r.profile_url }))
    reasons.push('in_outreach');
  if (inDedupeSet(rasHit, { channelName: r.channel_name, channelId: cid, email: r.email, profileUrl: r.profile_url }))
    reasons.push('in_ras_blacklist');

  if (reasons.length) {
    dupReport.push({ channel_name: r.channel_name, email: r.email, channel_id: cid, reasons: reasons.join('+') });
    continue;
  }
  if (ikey) internalSeen.add(ikey);
  clean.push(r);
}

clean.forEach((r, i) => {
  r.priority_rank = String(i + 1);
});
const outHdr = [...new Set(readyHdr)];
fs.writeFileSync(
  readyPath,
  [outHdr.join(','), ...clean.map((r) => outHdr.map((h) => esc(r[h])).join(','))].join('\n') + '\n'
);

// Update kol_uncontacted_master: remove outreach + ras hits
const masterPath = path.join(PATHS.queues, 'kol_uncontacted_master.csv');
const { header: masterHdr, rows: masterRows } = readCsv(masterPath);
const masterClean = masterRows.filter((r) => {
  const cid = r.channel_id || extractChannelId(r.profile_url);
  return (
    !inDedupeSet(outreachHit, { channelName: r.channel_name, channelId: cid, email: r.email, profileUrl: r.profile_url }) &&
    !inDedupeSet(rasHit, { channelName: r.channel_name, channelId: cid, email: r.email, profileUrl: r.profile_url })
  );
});
masterClean.forEach((r, i) => {
  r.priority_rank = String(i + 1);
});
fs.writeFileSync(
  masterPath,
  [masterHdr.join(','), ...masterClean.map((r) => masterHdr.map((h) => esc(r[h])).join(','))].join('\n') + '\n'
);

console.log(
  JSON.stringify(
    {
      xlsx_source: xlsxPath,
      outreach_rebuilt: outreachRows.length,
      outreach_path: PATHS.outreach,
      all_ready_before: readyRows.length,
      all_ready_after: clean.length,
      duplicates_removed_from_ready: dupReport.length,
      duplicates: dupReport,
      master_before: masterRows.length,
      master_after: masterClean.length,
    },
    null,
    2
  )
);
