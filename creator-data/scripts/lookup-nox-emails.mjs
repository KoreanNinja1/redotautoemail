#!/usr/bin/env node
import { execFileSync } from 'child_process';

const targets = [
  {
    rank: 4,
    name: 'easy crypto',
    channel_id: 'UCt2PIIb4V9nJqKxmlcsVn7A',
    subscribers: 748000,
    search_keywords: ['easy crypto', 'THE EASY CRYPTO'],
  },
  {
    rank: 5,
    name: 'Abdullah official yt',
    channel_id: 'UCIJpww7DaUSiMca5aKno2hQ',
    subscribers: 9870,
    search_keywords: ['Abdullah official yt', 'Abdullah official'],
  },
  {
    rank: 6,
    name: 'Tariq.crypto',
    channel_id: 'UCpM6L_Rw1VIfTYjdnRIJGpA',
    subscribers: 7830,
    search_keywords: ['Tariq.crypto', 'طارق كربتو'],
  },
  {
    rank: 7,
    name: 'Ehab Hosni',
    channel_id: 'UC9AtiQQ64WZnQupVB4WRDLg',
    subscribers: 4520,
    search_keywords: ['Ehab Hosni', 'ايهاب حسني'],
  },
];

function run(args) {
  const out = execFileSync('noxinfluencer', args, { encoding: 'utf8' });
  return JSON.parse(out);
}

function pickBest(items, subscribers) {
  if (!items?.length) return null;
  return [...items].sort((a, b) => {
    const da = Math.abs((a.followers || 0) - subscribers);
    const db = Math.abs((b.followers || 0) - subscribers);
    return da - db;
  })[0];
}

const results = [];

for (const t of targets) {
  const entry = {
    rank: t.rank,
    name: t.name,
    channel_id: t.channel_id,
    subscribers: t.subscribers,
    nox_creator_id: null,
    nox_nickname: null,
    email: null,
    other_contacts: [],
    method: null,
    note: null,
  };

  // Direct lookup
  for (const url of [
    `https://www.youtube.com/channel/${t.channel_id}`,
    `https://www.youtube.com/channel/${t.channel_id}/about`,
  ]) {
    try {
      const contacts = run(['creator', 'contacts', '--url', url]);
      if (contacts.success && contacts.data) {
        entry.nox_creator_id = contacts.data.creator_id || entry.nox_creator_id;
        entry.nox_nickname = contacts.data.nickname || entry.nox_nickname;
        entry.method = 'direct_url';
        const list = contacts.data.contacts || contacts.data.contact_list || [];
        for (const c of list) {
          if ((c.type || c.contact_type || '').toLowerCase().includes('email') && c.value) {
            entry.email = c.value;
          } else if (c.value) entry.other_contacts.push(c);
        }
        if (contacts.data.email) entry.email = contacts.data.email;
        break;
      }
    } catch {
      // not indexed
    }
  }

  // Search fallback
  if (!entry.email) {
    for (const kw of t.search_keywords) {
      try {
        const search = run([
          'creator',
          'search',
          '--platform',
          'youtube',
          '--keywords',
          `["${kw.replace(/"/g, '')}"]`,
          '--country',
          '["SA"]',
          '--page_size',
          '10',
        ]);
        const best = pickBest(search.data?.items, t.subscribers);
        if (!best) continue;
        entry.nox_creator_id = best.id;
        entry.nox_nickname = best.nickname;
        const contacts = run(['creator', 'contacts', best.id]);
        if (contacts.success && contacts.data) {
          entry.method = 'search_match';
          const list = contacts.data.contacts || contacts.data.contact_list || [];
          for (const c of list) {
            if ((c.type || c.contact_type || '').toLowerCase().includes('email') && c.value) {
              entry.email = c.value;
            } else if (c.value) entry.other_contacts.push(c);
          }
          if (contacts.data.email) entry.email = contacts.data.email;
        }
        if (entry.email) break;
        if (entry.nox_creator_id && !entry.note) {
          entry.note = `Nox match "${best.nickname}" (${best.followers} subs) but no visible email`;
        }
      } catch (e) {
        entry.note = String(e.message || e).slice(0, 200);
      }
    }
  }

  if (!entry.email && !entry.note) {
    entry.note = 'Not in Nox index or no public email on platform';
  }
  results.push(entry);
}

console.log(JSON.stringify(results, null, 2));
