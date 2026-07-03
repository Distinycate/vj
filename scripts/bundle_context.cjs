const fs = require('fs');
const path = require('path');

const filesToInclude = [
  { title: "README", path: "README.md" },
  { title: "AI Context", path: "AI_CONTEXT.md" },
  { title: "Card Battle AI Handoff", path: "AI_HANDOFF_CARD_BATTLE.md" },
  { title: "Academic Summary", path: "/Users/distinycate/.gemini/antigravity-ide/brain/e45066d0-793b-4468-bc65-8ea66247b982/vocab_journey_academic_summary.md", absolute: true },
  
  // Database Schemas & Migrations
  { title: "Base Schema", path: "SUPABASE_SCHEMA.sql" },
  { title: "Team Battle Migration", path: "MIGRATION_TEAM_BATTLE_FIX.sql" },
  { title: "Card Battle Migration", path: "MIGRATION_CARD_BATTLE.sql" },
  { title: "Card Admin Dashboard Migration", path: "MIGRATION_CARD_ADMIN_DASHBOARD.sql" },
  { title: "System Reset RPC", path: "scripts/add_reset_rpc.sql" },
  { title: "Team Battle Rewards Logic", path: "scripts/update_team_battle_rewards.sql" },
  { title: "Force Pretest Logic", path: "scripts/force_pretest_retake.sql" },

  // Core Frontend Logic
  { title: "Zustand State Store", path: "src/store/useAppStore.ts" },
  { title: "Card Battle Logic", path: "src/utils/cardBattle.ts" },
  { title: "Team Battle Engine", path: "src/utils/teamBattleEngine.ts" },
  { title: "Adaptive SRS Engine", path: "src/utils/adaptiveEngine.ts" }
];

let outputContent = `# Vocab Journey - Full System Context for AI Analysis
Generated on: ${new Date().toISOString()}

This document contains all the necessary context, database schemas, migrations, and core business logic for the Vocab Journey application. 
Use this document to analyze the system architecture, find potential bugs, or plan new features.

---

`;

for (const file of filesToInclude) {
  const filePath = file.absolute ? file.path : path.join('/Users/distinycate/Desktop/vj', file.path);
  outputContent += `## File: ${file.title} (${file.path})\n`;
  outputContent += '```' + (filePath.endsWith('.sql') ? 'sql' : filePath.endsWith('.ts') ? 'typescript' : 'markdown') + '\n';
  
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      outputContent += content + '\n';
    } else {
      outputContent += `// FILE NOT FOUND: ${filePath}\n`;
    }
  } catch (err) {
    outputContent += `// ERROR READING FILE: ${err.message}\n`;
  }
  
  outputContent += '```\n\n---\n\n';
}

const outputPath = '/Users/distinycate/.gemini/antigravity-ide/brain/e45066d0-793b-4468-bc65-8ea66247b982/vocab_journey_full_system_context.md';
fs.writeFileSync(outputPath, outputContent);
console.log(`Successfully generated context file at: ${outputPath}`);
