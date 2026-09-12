#!/usr/bin/env node
/**
 * Static scanner to verify that the client bundle has ZERO direct access to:
 * - students
 * - teachers
 * - learning_paths
 * - analytics_summary
 * - card_inventory
 * - card_admin_actions
 * - user_sessions
 * - economy_transactions
 * - shop_purchases
 * - stage_attempts
 * - privileged RPCs: purchase_shop_item, complete_stage_transaction, grant_student_reward, award_coins, award_xp, consume_energy, repair_all_student_profiles
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_TABLES = [
  'students',
  'teachers',
  'learning_paths',
  'analytics_summary',
  'card_inventory',
  'card_admin_actions',
  'user_sessions',
  'economy_transactions',
  'shop_purchases',
  'stage_attempts',
];

const PRIVILEGED_RPCS = [
  'purchase_shop_item',
  'complete_stage_transaction',
  'grant_student_reward',
  'award_coins',
  'award_xp',
  'consume_energy',
  'repair_all_student_profiles',
];

// Directories that run exclusively on server side
const SERVER_ONLY_DIRS = [
  path.join('src', 'app', 'api'),
  path.join('src', 'lib', 'server'),
];

function isServerOnly(filePath) {
  return SERVER_ONLY_DIRS.some((dir) => filePath.includes(dir));
}

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(fullPath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      // Exclude tests and migrations from client bundle scanning
      if (!file.endsWith('.test.ts') && !file.endsWith('.test.tsx')) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

const allFiles = walk(path.join(process.cwd(), 'src'));
const violations = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Server actions file marked with 'use server' is not client code
  if (content.trim().startsWith("'use server'") || content.trim().startsWith('"use server"')) {
    continue;
  }

  // Files in server-only folders are not in client bundle
  if (isServerOnly(filePath)) {
    continue;
  }

  // Check forbidden tables
  for (const table of FORBIDDEN_TABLES) {
    const tableRegex = new RegExp(`\\.from\\(['"\`]${table}['"\`]\\)`, 'g');
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
      // Ignore if inside supabase/client.ts guard definition
      if (filePath.endsWith('src/utils/supabase/client.ts')) continue;
      violations.push({
        file: filePath,
        type: 'FORBIDDEN_TABLE_DIRECT_ACCESS',
        target: table,
        match: match[0],
      });
    }
  }

  // Check privileged RPCs
  for (const rpc of PRIVILEGED_RPCS) {
    const rpcRegex = new RegExp(`\\.rpc\\(['"\`]${rpc}['"\`]`, 'g');
    let match;
    while ((match = rpcRegex.exec(content)) !== null) {
      if (filePath.endsWith('src/utils/supabase/client.ts')) continue;
      violations.push({
        file: filePath,
        type: 'PRIVILEGED_RPC_DIRECT_INVOCATION',
        target: rpc,
        match: match[0],
      });
    }
  }
}

console.log('====================================================');
console.log('FINAL RE-AUDIT A: CLIENT SUPABASE ACCESS SCANNER');
console.log('====================================================');
console.log(`Scanned ${allFiles.length} client files in src/`);
console.log(`Forbidden tables: ${FORBIDDEN_TABLES.join(', ')}`);
console.log(`Privileged RPCs: ${PRIVILEGED_RPCS.join(', ')}`);
console.log('----------------------------------------------------');

if (violations.length === 0) {
  console.log('STATUS: PASS — ZERO SENSITIVE DIRECT CLIENT SUPABASE ACCESS DETECTED.');
  console.log('Client bundle is 100% free of direct sensitive table and RPC access.');
  process.exit(0);
} else {
  console.error(`STATUS: FAIL — Found ${violations.length} violations:`);
  violations.forEach((v) => {
    console.error(` - [${v.type}] ${v.file}: ${v.match} (Target: ${v.target})`);
  });
  process.exit(1);
}
