// Patcht lib/db.js: ergaenzt PREMIUM_FLAG_MAP um die drei
// Profilbild-Slot-Tiers, damit jede Stufe nur 1x freischaltbar ist.
// Idempotent.

import fs from 'fs';
const PATH = process.env.HOME + '/vibevibo/lib/db.js';

const MARKER = `  status_slot:        "status_slot",`;
const INSERT = `  status_slot:        "status_slot",
  // Profilbild-Slot-Tiers: jede Stufe nur 1x freischaltbar
  extra_pic_slots:      "pic_slots_s",
  extra_pic_slots_xl:   "pic_slots_m",
  extra_pic_slots_mega: "pic_slots_l",`;

const c = fs.readFileSync(PATH, 'utf-8');

if (c.includes('extra_pic_slots:      "pic_slots_s"')) {
  console.log('Slot-Flags schon eingetragen, skip.');
  process.exit(0);
}
if (!c.includes(MARKER)) {
  console.error('Marker fuer PREMIUM_FLAG_MAP nicht gefunden');
  process.exit(1);
}

const out = c.replace(MARKER, INSERT);
fs.writeFileSync(PATH, out);
console.log('Slot-Flag-Patch angewendet (3 Eintraege).');
