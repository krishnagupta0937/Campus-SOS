/**
 * Safe, explicitly scoped cleanup script for sample / demo incident records.
 *
 * Safety rules:
 * 1. Only targets records with isDemo: true or publicId matching DEMO-*
 * 2. Never wipes genuine student or responder reports.
 * 3. Requires explicit --confirm flag to execute changes.
 * 4. Supports --dry-run mode to inspect targeted records without modifying anything.
 * 5. Automatically creates a timestamped backup before making any disk changes.
 */
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.resolve(__dirname, '../data/campus_sos_dev_db.json');
const isDryRun = process.argv.includes('--dry-run');
const isConfirmed = process.argv.includes('--confirm');

async function cleanDevStore() {
  console.log('=== Campus SOS Scoped Sample Incident Cleanup ===\n');

  if (!fs.existsSync(DB_PATH)) {
    console.log(`[DevStore Cleanup] File not found: ${DB_PATH}. No demo data present.`);
    return;
  }

  const raw = fs.readFileSync(DB_PATH, 'utf8');
  let db: any;
  try {
    db = JSON.parse(raw);
  } catch (err: any) {
    console.error(`[DevStore Cleanup] Failed to parse ${DB_PATH}:`, err.message);
    return;
  }

  const demoIncidents = (db.incidents || []).filter(
    (i: any) => i.isDemo === true || i.id?.startsWith('DEMO-') || i.publicId?.startsWith('DEMO-'),
  );

  const genuineIncidents = (db.incidents || []).filter(
    (i: any) => !(i.isDemo === true || i.id?.startsWith('DEMO-') || i.publicId?.startsWith('DEMO-')),
  );

  console.log(`[Status] Genuine reports found: ${genuineIncidents.length}`);
  console.log(`[Status] Demo/sample records found: ${demoIncidents.length}`);

  if (demoIncidents.length === 0) {
    console.log(`\n[DevStore Cleanup] Zero sample/demo records found in ${DB_PATH}. All records are genuine.`);
    return;
  }

  const demoIds = new Set(demoIncidents.map((i: any) => i.id));
  const demoPublicIds = demoIncidents.map((i: any) => i.publicId || i.id);
  console.log(`\nIdentified demo records to remove:`);
  demoPublicIds.forEach((pid: string) => console.log(`  - ${pid}`));

  if (isDryRun || !isConfirmed) {
    console.log(`\n[SAFETY NOTICE] No modifications made.`);
    if (!isConfirmed) {
      console.log(`Execution blocked: explicit confirmation required.`);
      console.log(`To execute this scoped cleanup, run:`);
      console.log(`  npx ts-node scripts/cleanup-sample-incidents.ts --confirm\n`);
    } else {
      console.log(`Dry run mode active (--dry-run).`);
    }
    return;
  }

  // Backup before scoped cleanup
  const backupPath = `${DB_PATH}.backup-${Date.now()}`;
  fs.writeFileSync(backupPath, raw, 'utf8');
  console.log(`\n[DevStore Cleanup] Created database backup at: ${backupPath}`);

  // Scoped purge of ONLY demo IDs
  db.incidents = db.incidents.filter((i: any) => !demoIds.has(i.id));
  db.incidentLocations = (db.incidentLocations || []).filter((l: any) => !demoIds.has(l.incidentId));
  db.incidentTeams = (db.incidentTeams || []).filter((it: any) => !demoIds.has(it.incidentId));
  db.routingDecisions = (db.routingDecisions || []).filter((rd: any) => !demoIds.has(rd.incidentId));
  db.aiClassifications = (db.aiClassifications || []).filter((ai: any) => !demoIds.has(ai.incidentId));
  db.assignments = (db.assignments || []).filter((a: any) => !demoIds.has(a.incidentId));
  db.notifications = (db.notifications || []).filter((n: any) => !demoIds.has(n.incidentId));

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`[DevStore Cleanup] Successfully purged ${demoIncidents.length} demo records.`);
  console.log(`[DevStore Cleanup] ${genuineIncidents.length} genuine incidents preserved intact.\n`);
}

void cleanDevStore();
