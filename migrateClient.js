/**
 * migrateClient.js
 * Migrates a single client + their associated company between Supabase projects.
 *
 * NOTE: At time of creation (2026-05-24), "Jacobo Hill" was found in PRODUCTION,
 * not staging. This script migrates prod → staging by default.
 * To reverse direction, swap the SOURCE_* and TARGET_* constants below.
 *
 * Usage:
 *   node migrateClient.js
 *   node migrateClient.js "Client Name"
 */

import { createClient } from "@supabase/supabase-js";
import readline from "readline";

// ─── Configuration ────────────────────────────────────────────────────────────
const SOURCE_URL  = "https://arwvosghwecyzpqartrh.supabase.co";
const SOURCE_KEY  = process.env.SOURCE_ANON_KEY  || "YOUR_PRODUCTION_ANON_KEY";

const TARGET_URL  = "https://kpwzeawgrqdsezflvjkm.supabase.co";
const TARGET_KEY  = process.env.TARGET_ANON_KEY  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwd3plYXdncnFkc2V6Zmx2amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Mzc1MzIsImV4cCI6MjA5NTExMzUzMn0.-fvmwgZqwyddWyq1IJ4vcHvsTVMpPmhI72p4hyCtC6E";

const CLIENT_NAME = process.argv[2] || "Jacobo Hill";
// ─────────────────────────────────────────────────────────────────────────────

const source = createClient(SOURCE_URL, SOURCE_KEY);
const target = createClient(TARGET_URL, TARGET_KEY);

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function hr() { console.log("─".repeat(60)); }

async function main() {
  console.log(`\n🔍 Searching for client "${CLIENT_NAME}" in SOURCE DB...`);
  hr();

  // 1. Find the client
  const { data: clients, error: clientErr } = await source
    .from("clients")
    .select("*")
    .ilike("name", `%${CLIENT_NAME}%`);

  if (clientErr) { console.error("❌ Error querying source clients:", clientErr.message); process.exit(1); }
  if (!clients || clients.length === 0) { console.error(`❌ No client matching "${CLIENT_NAME}" found in source DB.`); process.exit(1); }
  if (clients.length > 1) {
    console.log(`⚠️  Multiple matches found:`);
    clients.forEach((c, i) => console.log(`  [${i}] ${c.name} (id: ${c.id})`));
    const idx = await ask("Enter index to migrate: ");
    clients.splice(0, clients.length, clients[parseInt(idx, 10)]);
  }

  const client = clients[0];
  console.log(`✓ Found client: ${client.name} (id: ${client.id})`);
  console.log(`  company_id: ${client.company_id}`);

  // 2. Fetch the company
  let company = null;
  if (client.company_id) {
    const { data: co, error: coErr } = await source
      .from("companies")
      .select("*")
      .eq("id", client.company_id)
      .single();
    if (coErr) { console.warn("⚠️  Could not fetch company:", coErr.message); }
    else { company = co; }
  }

  // 3. Preview
  hr();
  console.log("\n📋 MIGRATION PREVIEW — the following will be written to TARGET DB:\n");
  if (company) {
    console.log(`  COMPANY: ${company.name}`);
    console.log(`    id:      ${company.id}`);
    console.log(`    address: ${company.address || "—"}`);
    console.log(`    email:   ${company.email || "—"}`);
  } else {
    console.log("  COMPANY: (none — client has no company_id or company not found)");
  }
  console.log(`\n  CLIENT: ${client.name}`);
  console.log(`    id:        ${client.id}`);
  console.log(`    status:    ${client.status}`);
  console.log(`    dob:       ${client.date_of_birth || "—"}`);
  const diagCount = (() => { try { return JSON.parse(client.diagnoses || "[]").filter(d => d.value).length; } catch { return 0; } })();
  const medCount  = (() => { try { return JSON.parse(client.medications || "[]").filter(m => m.name).length; } catch { return 0; } })();
  console.log(`    diagnoses: ${diagCount}, medications: ${medCount}`);
  hr();

  // 4. Ask for approval
  const answer = await ask("\n⚠️  Proceed with writing to TARGET DB? Type 'yes' to confirm: ");
  if (answer.toLowerCase() !== "yes") {
    console.log("\n🚫 Migration cancelled. No data was written.");
    process.exit(0);
  }

  // 5. Upsert company first (satisfies FK)
  if (company) {
    console.log("\n⬆️  Upserting company...");
    const { error: coInsertErr } = await target
      .from("companies")
      .upsert(company, { onConflict: "id" });
    if (coInsertErr) { console.error("❌ Failed to upsert company:", coInsertErr.message); process.exit(1); }
    console.log("  ✓ Company upserted.");
  }

  // 6. Upsert client
  console.log("⬆️  Upserting client...");
  const { error: clientInsertErr } = await target
    .from("clients")
    .upsert(client, { onConflict: "id" });
  if (clientInsertErr) { console.error("❌ Failed to upsert client:", clientInsertErr.message); process.exit(1); }
  console.log("  ✓ Client upserted.");

  hr();
  console.log(`\n✅ Migration complete! "${client.name}" is now in the target database.\n`);
}

main().catch(err => { console.error("Unexpected error:", err); process.exit(1); });
