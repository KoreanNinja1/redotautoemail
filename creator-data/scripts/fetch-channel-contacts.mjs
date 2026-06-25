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

const channels = [
  ['easy crypto', 'UCt2PIIb4V9nJqKxmlcsVn7A'],
  ['Abdullah official yt', 'UCIJpww7DaUSiMca5aKno2hQ'],
  ['Tariq.crypto', 'UCpM6L_Rw1VIfTYjdnRIJGpA'],
  ['Ehab Hosni', 'UC9AtiQQ64WZnQupVB4WRDLg'],
];

for (const [name, id] of channels) {
  const res = await fetch(`${env.YTK_BASE_URL}/api/channels/${id}/snapshot`, {
    headers: { Authorization: `Bearer ${env.YTK_API_KEY}` },
  });
  const j = await res.json();
  const snap = j.snapshot || j.data?.snapshot || j;
  const contact = snap.contact || j.contact || {};
  const kolsContact = j.channel_report?.contact || j.report?.contact || null;
  console.log(
    JSON.stringify({
      name,
      channel_id: id,
      title: snap.title || j.title || j.channel?.title,
      contact_from_snapshot: contact,
      contact_from_report: kolsContact,
      top_level_keys: Object.keys(j),
    })
  );
}
