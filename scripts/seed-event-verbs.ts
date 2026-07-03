import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedEventVerbs() {
  console.log('Seeding Event and Verbs...');
  
  // 1. Create or ensure Event exists
  const eventSlug = 'verb-master';
  
  const { data: eventData } = await supabase
    .from('events')
    .select('id')
    .eq('slug', eventSlug)
    .single();
    
  let event = eventData;
  if (!event) {
    console.log('Creating Verb Master event (status: upcoming)...');
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        slug: eventSlug,
        title: 'Verb Master Challenge',
        description: 'ท้าทายความจำ พิมพ์กริยา 3 ช่องให้ถูกต้องเพื่อปลดล็อกเข็มกลัดแห่งกาลเวลา!',
        event_type: 'verb',
        theme: 'Castle of Time',
        status: 'upcoming', // Admin will manually open it
        settings: { total_phases: 3, hearts: 3 }
      })
      .select('id')
      .single();
      
    if (insertError) {
      console.error('Error creating event:', insertError);
      return;
    }
    event = newEvent;
  } else {
    console.log(`Event "${eventSlug}" already exists (id: ${event.id})`);
  }
  
  const eventId = event.id;
  
  // 2. Read words from JSON
  const filePath = join(process.cwd(), 'src/data/verb-master-words.json');
  const fileContent = readFileSync(filePath, 'utf-8');
  const words = JSON.parse(fileContent);
  
  console.log(`Loaded ${words.length} verbs from JSON. Upserting to database...`);
  
  // 3. Upsert Verbs
  for (const word of words) {
    const { error } = await supabase
      .from('event_verbs')
      .upsert(
        {
          event_id: eventId,
          order_no: word.order_no,
          base_form: word.base_form,
          past_simple: word.past_simple,
          past_participle: word.past_participle,
          meaning_th: word.meaning_th,
          pronunciation_base: word.pronunciation_base,
          pronunciation_past: word.pronunciation_past,
          pronunciation_participle: word.pronunciation_participle,
          difficulty_rank: word.difficulty_rank,
          category: word.category,
        },
        { onConflict: 'event_id,base_form' }
      );
      
    if (error) {
      console.error(`Error inserting word: ${word.base_form}`, error);
    }
  }
  
  console.log('✅ Seed completed successfully!');
}

seedEventVerbs().catch(console.error);
