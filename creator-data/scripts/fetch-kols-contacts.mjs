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

const res = await fetch(`${env.YTK_BASE_URL}/api/kols?market=Saudi%20Arabia&limit=50&score_min=50`, {
  headers: { Authorization: `Bearer ${env.YTK_API_KEY}` },
});
const j = await res.json();
const targets = [
  'UCt2PIIb4V9nJqKxmlcsVn7A',
  'UCIJpww7DaUSiMca5aKno2hQ',
  'UCpM6L_Rw1VIfTYjdnRIJGpA',
  'UC9AtiQQ64WZnQupVB4WRDLg',
];
for (const id of targets) {
  const item = j.items.find((x) => x.channel_id === id);
  console.log(JSON.stringify({ channel_id: id, title: item?.title, contact: item?.contact ?? null }));
}
