/**
 * Safe, explicitly scoped cleanup script for sample / demo incident records.
 * Safety rules:
 * 1. Only targets records with isDemo: true or publicId matching DEMO-*
 * 2. Never wipes genuine student reports.
 * 3. Supports dry-run mode (--dry-run).
 */
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.resolve(__dirname, '../data/campus_sos_dev_db.json');
const isDryRun = process.argv.includes('--dry-run');

async function cleanDevStore() {
  if (!fs.existsSync(DB_PATH)) {
    console.log(`[DevStore Cleanup] File not found: ${DB_PATH}. Skipping.`);
    return;
  }

  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const db = JSON.parse(raw);

  const demoIncidents = (db.incidents || []).filter(
    (i: any) => i.isDemo === true || i.id?.startsWith('DEMO-') || i.publicId?.startsWith('DEMO-'),
  );

  if (demoIncidents.length === 0) {
    console.log(`[DevStore Cleanup] Zero sample/demo records found in ${DB_PATH}. Genuine records preserved.`);
    return;
  }

  const demoIds = new Set(demoIncidents.map((i: any) => i.id));
  console.log(`[DevStore Cleanup] Found ${demoIncidents.length} demo records:`, Array.from(demoIds));

  if (isDryRun) {
    console.log('[DevStore Cleanup] Dry run active — no records modified.');
    return;
  }

  // Backup before scoped cleanup
  const backupPath = `${DB_PATH}.backup-${Date.now()}`;
  fs.writeFileSync(backupPath, raw, 'utf8');
  console.log(`[DevStore Cleanup] Created backup at ${backupPath}`);

  // Scoped purge of only demo IDs
  db.incidents = db.incidents.filter((i: any) => !demoIds.has(i.id));
  db.incidentLocations = (db.incidentLocations || []).filter((l: any) => !demoIds.has(l.incidentId));
  db.incidentTeams = (db.incidentTeams || []).filter((it: any) => !demoIds.has(it.incidentId));
  db.routingDecisions = (db.routingDecisions || []).filter((rd: any) => !demoIds.has(rd.incidentId));
  db.aiClassifications = (db.aiClassifications || []).filter((ai: any) => !demoIds.has(ai.incidentId));
  db.assignments = (db.assignments || []).filter((a: any) => !demoIds.has(a.incidentId));
  db.notifications = (db.notifications || []).filter((n: any) => !demoIds.has(n.incidentId));

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`[DevStore Cleanup] Successfully purged ${demoIncidents.length} demo records. Genuine reports preserved.`);
}

void cleanDevStore();
