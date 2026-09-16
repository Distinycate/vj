const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SENSITIVE_TABLES = [
  'students',
  'learning_paths',
  'stage_attempts',
  'stage_results',
  'economy_transactions',
  'attempts'
];

const SRC_DIR = path.join(__dirname, '../src');

// Files allowed to access these tables securely (Server-Side)
const ALLOWED_FILES = [
  '/api/',
  '/lib/server/',
  'actions.ts',
];

function isAllowedFile(filePath) {
  const relativePath = filePath.replace(SRC_DIR, '').replace(/\\/g, '/');
  return ALLOWED_FILES.some(allowedPath => relativePath.includes(allowedPath));
}

let hasViolations = false;

console.log('Running Source-Level Security Scanner for Sensitive Tables...');

const files = glob.sync('**/*.{ts,tsx}', { cwd: SRC_DIR, absolute: true });

for (const file of files) {
  if (isAllowedFile(file)) continue;

  const content = fs.readFileSync(file, 'utf8');
  
  for (const table of SENSITIVE_TABLES) {
    // Look for `.from('table_name')` or `.from("table_name")` or `.from(`table_name`)`
    const regex = new RegExp(`\\.from\\(['"\`]${table}['"\`]\\)`, 'g');
    
    if (regex.test(content)) {
      console.error(`\n🚨 SECURITY VIOLATION: Client-side or disallowed module is directly accessing the '${table}' table.`);
      console.error(`File: ${file}`);
      console.error(`The table '${table}' must only be accessed through authenticated Next.js server APIs.`);
      hasViolations = true;
    }
  }
}

if (hasViolations) {
  console.error('\n❌ Security scan failed. Please refactor client-side database access to use server API endpoints.');
  process.exit(1);
} else {
  console.log('✅ Security scan passed. No direct client-side sensitive table accesses found.');
  process.exit(0);
}
