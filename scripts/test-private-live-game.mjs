import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const question = (qid,vocab,type) => ({ public_id:id(qid),id:id(vocab),word:'fixture',question_type:type,choices:[1,2,3,4] });
const pair = [question(10,30,'listening_mc'),question(11,31,'spelling')];
const action = async (sql,params) => (await db.query('select '+sql+' as result',params)).rows[0].result;
const answer = (q,text,correct,user=1,attempt=3) =>
  action('submit_private_game_answer($1,$2,$3,$4,$5,900)',[id(attempt),id(user),id(q),text,correct]);
const powerup = (q,code) => action('use_private_game_powerup($1,$2,$3,$4)',[id(3),id(1),id(q),code]);
const finish = (user=1,attempt=3) => action('complete_private_game_stage($1,$2)',[id(attempt),id(user)]);
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE stage_attempts(id uuid PRIMARY KEY,student_id uuid,status text,expires_at timestamptz,stage_number int,question_ids jsonb,score int);
    GRANT SELECT(question_ids) ON stage_attempts TO anon;
    CREATE TABLE items(id uuid PRIMARY KEY,item_code text);
    CREATE TABLE stages(id uuid,stage_number int);
    CREATE TABLE student_inventory(student_id uuid,item_id uuid,quantity int,UNIQUE(student_id,item_id));
    CREATE TABLE item_usage_logs(student_id uuid,item_id uuid,stage_id uuid,question_word text);
    CREATE TABLE hints(attempt_id uuid,question_id uuid);
    CREATE FUNCTION record_attempt_hint_v3(uuid,uuid,uuid) RETURNS jsonb LANGUAGE plpgsql AS $$
      BEGIN INSERT INTO hints VALUES ($2,$3); RETURN '{}'; END $$;
    CREATE FUNCTION complete_stage_with_progression_v3(uuid,uuid,jsonb,timestamptz) RETURNS jsonb LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS(SELECT 1 FROM stage_attempts WHERE id=$1 AND status='COMPLETED') THEN RETURN '{"already_completed":true}'; END IF;
        UPDATE stage_attempts SET status='COMPLETED',score=(SELECT count(*) FROM jsonb_array_elements($3) a WHERE (a->>'is_correct')::boolean) WHERE id=$1;
        RETURN jsonb_build_object('answers',$3);
      END $$;
    INSERT INTO items VALUES('${id(40)}','FIFTY_FIFTY'),('${id(41)}','HINT');
    INSERT INTO student_inventory VALUES('${id(1)}','${id(40)}',2),('${id(1)}','${id(41)}',1);
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261123165742_private_live_game_answers.sql',import.meta.url),'utf8'));
  for (const [attempt, expires, questions] of [[3,'tomorrow',pair],[4,'yesterday',pair],[5,'tomorrow',[{id:id(30)}]]]) {
    await db.query("INSERT INTO stage_attempts VALUES($1,$2,'ACTIVE',$3,1,$4,null)",[id(attempt),id(1),expires,JSON.stringify(questions)]);
  }
  await assert.rejects(answer(10,'x',true,2),/LIVE_ATTEMPT_NOT_FOUND/);
  await assert.rejects(answer(10,'x',true,1,4),/LIVE_ATTEMPT_CLOSED/);
  await assert.rejects(finish(1,5),/LIVE_ATTEMPT_NOT_PRIVATE/);
  await assert.rejects(answer(11,'next',true),/LIVE_QUESTION_OUT_OF_ORDER/);
  await assert.rejects(powerup(10,'HINT'),/LIVE_POWERUP_NOT_APPLICABLE/);
  assert.equal((await powerup(10,'FIFTY_FIFTY')).remaining,1);
  assert.equal((await powerup(10,'FIFTY_FIFTY')).remaining,1);
  assert.equal((await answer(10,'wrong',false)).correct,false);
  assert.equal((await answer(10,'wrong',false)).correct,false);
  await assert.rejects(answer(10,'different',true),/LIVE_ANSWER_LOCKED/);
  await assert.rejects(powerup(11,'FIFTY_FIFTY'),/LIVE_POWERUP_ALREADY_USED/);
  assert.equal((await powerup(11,'HINT')).remaining,0);
  assert.equal((await answer(11,'fixture',true)).correct,true);
  assert.equal((await db.query('SELECT count(*)::int n FROM item_usage_logs')).rows[0].n,2);
  assert.equal((await db.query('SELECT count(*)::int n FROM hints')).rows[0].n,2);
  assert.deepEqual((await finish()).answers.map(a=>[a.word_id,a.is_correct]),[[id(30),false],[id(31),true]]);
  assert.equal((await finish()).score,1);
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query('SELECT * FROM live_game_answers'),/permission denied/);
  await assert.rejects(db.query('SELECT question_ids FROM stage_attempts'),/permission denied/);
  await assert.rejects(finish(),/permission denied/);
  console.log('PASS live game: ownership, expiry, legacy isolation, order, frozen answers, idempotent powerups and completion, DB permissions');
} finally { await db.close(); }
