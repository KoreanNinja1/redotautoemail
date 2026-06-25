import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Project root (RedotPay-KOL-BD), works on any machine after clone. */
export const PROJECT = path.resolve(__dirname, '../..');

function resolveKolEnv() {
  if (process.env.KOL_ENV_FILE && fs.existsSync(process.env.KOL_ENV_FILE)) {
    return process.env.KOL_ENV_FILE;
  }
  const localEnv = path.join(PROJECT, '.env.local');
  if (fs.existsSync(localEnv)) return localEnv;
  return localEnv;
}

export const PATHS = {
  outreach: path.join(PROJECT, 'creator-data/blacklists/outreach_do_not_contact.csv'),
  rasBelow60: path.join(PROJECT, 'creator-data/blacklists/ras_below_60.csv'),
  unsupported: path.join(PROJECT, 'creator-data/references/unsupported_countries.csv'),
  queues: path.join(PROJECT, 'creator-data/queues'),
  kolEnv: resolveKolEnv(),
};

export function queuePath(slug, date = new Date().toISOString().slice(0, 10)) {
  return path.join(PATHS.queues, `nox_queue_${slug}_${date}.csv`);
}
