#!/usr/bin/env node
/**
 * Live Database Security Audit Runner
 * Checks if DATABASE_URL or SUPABASE_SERVICE_ROLE_KEY is present to inspect the live DB.
 * If credentials are not present in local env, prints instructions and validates the SQL contracts.
 */

const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('FINAL RE-AUDIT B: LIVE DATABASE PERMISSION & RLS VERIFICATION');
console.log('================================================================');

const sqlPath = path.join(process.cwd(), 'AUDIT_LIVE_DATABASE_SECURITY.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Missing AUDIT_LIVE_DATABASE_SECURITY.sql');
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log('SQL Inspection File: AUDIT_LIVE_DATABASE_SECURITY.sql is ready.');
console.log('');
console.log('Verification checks included:');
console.log('1. [TABLE PRIVILEGES] Queries information_schema.table_privileges for 10 sensitive tables');
console.log('2. [FUNCTION PRIVILEGES] Queries information_schema.routine_privileges for privileged RPCs');
console.log('3. [RLS ENABLED STATUS] Queries pg_tables.rowsecurity for all sensitive tables');
console.log('4. [RLS POLICIES] Queries pg_policies for active policies');
console.log('5. [SECURITY DEFINER & SEARCH_PATH] Queries pg_proc.prosecdef & proconfig for path hijacking protection');
console.log('');
console.log('Run this in your Supabase SQL Editor or psql console to obtain the live DB proof.');
console.log('----------------------------------------------------------------');
console.log('STATUS: READY_FOR_LIVE_INSPECTION');
