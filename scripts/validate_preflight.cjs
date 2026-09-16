const fs = require('fs');

const sqlFile = process.argv[2];
if (!sqlFile) {
    console.error('Usage: node validate_preflight.js <file.sql>');
    process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');

let hasError = false;

function reportError(lineNum, line, message) {
    console.error(`ERROR at line ${lineNum}: ${message}\n  > ${line ? line.trim() : ''}`);
    hasError = true;
}

const lines = sql.split('\n');

const mutatingKeywords = /\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE)\b/i;

let foundJsonbRecordset = false;

const v3DirectReferences = [
    /\bstudent_stage_progress\b/i,
    /\battempt_hint_events\b/i,
    /\bstage_attempts\.hint_count\b/i,
    /\bstage_attempts\.stars\b/i,
    /\bstage_attempts\.stage_id\b/i,
    /\blearning_paths\.campaign_completed_at\b/i,
    /\beconomy_transactions\.primary_reason\b/i,
    /\beconomy_transactions\.bonus_flags\b/i,
    /\brecord_attempt_hint_v3\b/i,
    /\bcomplete_stage_with_progression_v3\b/i
];

lines.forEach((line, i) => {
    const lineNum = i + 1;
    
    // Ignore comments
    if (line.trim().startsWith('--')) return;
    
    // Check for mutating keywords
    if (mutatingKeywords.test(line)) {
        // Exception logic
        if (!line.includes('pg_get_constraintdef') && 
            !line.includes('policyname') && 
            !line.includes('information_schema') &&
            !line.includes('role_table_grants') &&
            !line.includes('role_routine_grants') &&
            !line.includes('pg_policies')) {
            reportError(lineNum, line, 'Found forbidden mutating keyword.');
        }
    }

    // Check for V3 references. We only allow them as string literals
    v3DirectReferences.forEach(regex => {
        if (regex.test(line)) {
            const match = line.match(regex)[0];
            const idx = line.search(regex);
            let quoteCountBefore = (line.substring(0, idx).match(/'/g) || []).length;
            if (quoteCountBefore % 2 === 0) {
                // Also check if it's part of a JSON key (like 'stars')
                reportError(lineNum, line, `Direct reference to V3 object ${match} outside of a string literal.`);
            }
        }
    });

    if (line.includes('jsonb_to_recordset')) {
        foundJsonbRecordset = true;
    }
});

if (!foundJsonbRecordset) {
    reportError(lines.length, '', 'Missing final SELECT jsonb_to_recordset(...) statement to render visible table results.');
}

if (hasError) {
    console.error('Validation FAILED.');
    process.exit(1);
} else {
    console.log('Validation PASSED.');
    process.exit(0);
}
