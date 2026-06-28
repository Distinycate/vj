import fs from 'fs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables manually for the script
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Reading CSV...");
  const csvFilePath = '/Users/distinycate/Desktop/นวัตกรรมคำศัพท์ภาษาอังกฤษ/outputs/vocabulary_database/vocab_image_all_992_keywords.csv';
  
  if (!fs.existsSync(csvFilePath)) {
    console.error("CSV file not found at path:", csvFilePath);
    process.exit(1);
  }

  const csvFile = fs.readFileSync(csvFilePath, 'utf8');
  
  Papa.parse(csvFile, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      console.log(`Parsed ${results.data.length} rows.`);
      const rows = results.data;
      
      const vocabToInsert = [];
      
      // Let's clear the vocabulary table first so we don't have duplicates
      console.log("Clearing existing vocabulary...");
      await supabase.from('vocabulary').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      let currentStage = 1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Every 10 words is a new stage
        currentStage = Math.floor(i / 10) + 1;

        vocabToInsert.push({
          word_id: row.WordID || `M1-${String(i+1).padStart(3, '0')}`,
          grade_level: row.GradeLevel || 'M1',
          word: row.Word || '',
          meaning: row.Meaning || '',
          part_of_speech: row.PartOfSpeech || '',
          category: row.Category || '',
          example: row.Example || '',
          stage: currentStage,
          image_url: row.ImageURL || null
        });
      }

      console.log(`Prepared ${vocabToInsert.length} words for insertion.`);

      // Insert in batches of 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < vocabToInsert.length; i += BATCH_SIZE) {
        const batch = vocabToInsert.slice(i, i + BATCH_SIZE);
        console.log(`Inserting batch ${i} to ${i + batch.length - 1}...`);
        const { error } = await supabase.from('vocabulary').insert(batch);
        
        if (error) {
          console.error(`Error inserting batch:`, error.message);
          return;
        }
      }

      console.log("✅ Successfully imported all vocabulary into Supabase!");
    }
  });
}

main();
