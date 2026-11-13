#!/usr/bin/env node
/**
 * PRE-MAJOR UPDATE DATABASE SNAPSHOT EXPORTER
 * Exports all critical student progression, classroom, and audit tables
 * into backups/snapshot_pre_major_update_202611/
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseServiceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const backupDir = path.join(process.cwd(), 'backups', `snapshot_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const tablesToExport = [
  'students',
  'classrooms',
  'teachers',
  'learning_paths',
  'events',
  'wrong_words',
  'stage_results',
  'analytics_summary',
  'cards',
  'card_inventory',
];

async function runBackup() {
  console.log(`Starting database snapshot into: ${backupDir}`);
  const summary = {};

  for (const table of tablesToExport) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        console.warn(`⚠️ Warning: could not export table '${table}':`, error.message);
        continue;
      }

      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data || [], null, 2), 'utf8');
      console.log(`✅ Exported ${table}: ${data?.length || 0} rows -> ${path.basename(filePath)}`);
      summary[table] = data?.length || 0;
    } catch (err) {
      console.error(`❌ Error exporting ${table}:`, err);
    }
  }

  // Write manifest
  const manifest = {
    createdAt: new Date().toISOString(),
    supabaseUrl,
    tableCounts: summary,
  };
  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('\n🎉 Database snapshot completed successfully!');
}

runBackup().catch(console.error);
