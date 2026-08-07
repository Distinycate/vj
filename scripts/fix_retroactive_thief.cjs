const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key to bypass RLS for administrative script
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching THIEF_RANDOM card id...');
  const { data: cards, error: cardErr } = await supabase.from('cards').select('id, card_code').in('card_code', ['THIEF_RANDOM', 'THIEF_MASTER']);
  if (cardErr) {
    console.error('Error fetching cards', cardErr);
    return;
  }
  const randomCard = cards.find(c => c.card_code === 'THIEF_RANDOM');
  if (!randomCard) {
    console.error('THIEF_RANDOM card not found in DB');
    return;
  }

  console.log('Fetching approved THIEF_RANDOM card_logs...');
  // Find logs that are RESOLVED and involve the random thief card
  const { data: logs, error: logErr } = await supabase
    .from('card_logs')
    .select('*')
    .eq('played_card_id', randomCard.id)
    .eq('status', 'RESOLVED');

  if (logErr) {
    console.error('Error fetching logs', logErr);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log('No retro-active logs found. Everything is fine.');
    return;
  }

  console.log(`Found ${logs.length} approved THIEF_RANDOM logs to process retroactively.`);

  for (const log of logs) {
    // Check if we already processed this log (using metadata)
    if (log.metadata && log.metadata.processed_retroactively) {
      console.log(`Log ${log.id} already processed. Skipping.`);
      continue;
    }

    console.log(`Processing log ${log.id} for attacker ${log.attacker_id}...`);
    try {
      // Step 1: Temporarily add the card back to the attacker's inventory so the RPC can consume it
      const { data: inventoryData, error: invError } = await supabase.from('card_inventory')
        .select('quantity')
        .eq('student_id', log.attacker_id)
        .eq('card_id', randomCard.id)
        .maybeSingle();

      if (invError) throw invError;
      
      const currentQty = inventoryData ? inventoryData.quantity : 0;
      
      const { error: upsertError } = await supabase.from('card_inventory').upsert({
        student_id: log.attacker_id,
        card_id: randomCard.id,
        quantity: currentQty + 1,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id, card_id' });
      
      if (upsertError) throw upsertError;

      // Step 2: Execute the thief random logic
      const { data: rpcData, error: rpcError } = await supabase.rpc('execute_random_thief', {
        p_attacker_id: log.attacker_id,
        p_thief_card_id: randomCard.id
      });

      if (rpcError) {
        console.error(`Failed to execute thief for log ${log.id}:`, rpcError.message);
        // Clean up the temporarily added card
        await supabase.from('card_inventory').upsert({
          student_id: log.attacker_id,
          card_id: randomCard.id,
          quantity: currentQty,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id, card_id' });
        continue;
      }

      if (rpcData && rpcData.success === false) {
         console.log(`Log ${log.id} thief failed (e.g. no targets): ${rpcData.reason}`);
         // Clean up the temporarily added card since it didn't consume it if it failed with exception, but wait, if it returns success=false, did it consume?
         // execute_random_thief returns success=false for NO_ELIGIBLE_TARGETS before atomic transfer. So card wasn't consumed.
         await supabase.from('card_inventory').upsert({
           student_id: log.attacker_id,
           card_id: randomCard.id,
           quantity: currentQty,
           updated_at: new Date().toISOString()
         }, { onConflict: 'student_id, card_id' });
      } else {
         console.log(`Log ${log.id} steal successful! Stolen card: ${rpcData.stolen_card_name}`);
      }

      // Step 3: Mark log as processed
      const updatedMetadata = { ...(log.metadata || {}), processed_retroactively: true, retro_result: rpcData };
      await supabase.from('card_logs').update({ metadata: updatedMetadata }).eq('id', log.id);
      
    } catch (e) {
      console.error(`Unexpected error processing log ${log.id}:`, e);
    }
  }

  console.log('Retroactive processing complete.');
}

run();
