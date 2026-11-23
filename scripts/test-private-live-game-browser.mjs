// Run with a local Next server. All application APIs and external fetches are intercepted.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true });
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3117';
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12,'0');
const progress = { current_stage:1,current_rank:1,coins:0,exp:0,total_exp:0,pretest_date:'2026-11-23T00:00:00Z' };
const question = (n,qType,question_type,prompt,choices=[]) =>
  ({ id:id(n),qType,question_type,prompt,answer_language:'en',serverGraded:true,stageType:'STANDARD',choices });
const questions = [
  question(2,'LISTENING_MC','listening_mc','ฟังคำศัพท์', ['ability','able','active','alone'].map((text,i)=>({text,word_id:id(21+i)}))),
  question(3,'FILL_BLANK','spelling','ความสามารถ'),
];
try {
  for (const width of [390,1440]) {
    const context = await browser.newContext({ viewport:{width,height:900}, serviceWorkers:'block' });
    const page = await context.newPage();
    const submissions=[];
    let audio=0, complete=0, hints=0;
    await context.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url()),path=url.pathname;
      if(path.endsWith('/rest/v1/student_inventory')) return route.fulfill({json:[{id:id(51),quantity:1,items:{item_code:'HINT',name:'Hint'}}]});
      if(url.origin!==base) return route.fulfill({json:[]});
      if(path==='/api/auth/me') return route.fulfill({json:{authenticated:true,role:'STUDENT',user:{id:id(1),student_name:'Fixture',userType:'INTERNAL',is_verified:true},progress}});
      if(path==='/api/student/progression') return route.fulfill({json:{authority:'V3',currentStage:1,unlockedStages:[1],completedStages:[]}});
      if(path==='/api/student/profile') return route.fulfill({json:{success:true,learningPath:progress}});
      if(path==='/api/game/start'){
        assert.equal(req.headers()['x-vj-game-protocol'],'private-v1');
        return route.fulfill({json:{success:true,attemptId:id(10),questions,timeLimit:25}});
      }
      if(path==='/api/game/audio'){
        audio++; assert.equal(url.searchParams.get('questionId'),id(2)); assert.equal(url.searchParams.has('word'),false);
        return route.fulfill({status:502});
      }
      if(path==='/api/game/answer'){
        const p=req.postDataJSON();
        if(p.action==='powerup'){
          hints++; assert.equal(p.itemCode,'HINT');
          return route.fulfill({json:{success:true,remaining:0,hiddenChoiceIds:[],hint:{initial:'a',length:7}}});
        }
        submissions.push(p);
        if(submissions.length===1) return route.fulfill({status:503,json:{error:'ลองเชื่อมต่อใหม่'}});
        if(p.questionId===id(2)) return route.fulfill({json:{success:true,correct:true,correctChoiceId:id(21),correctText:null}});
        return route.fulfill({json:{success:true,correct:false,correctChoiceId:null,correctText:'ability'}});
      }
      if(path==='/api/game/complete'){
        complete++; assert.deepEqual(req.postDataJSON(),{attemptId:id(10),answers:[]});
        return route.fulfill({json:{success:true,passed:false,score:1,accuracy:50,currentStage:1,earnedCoins:0}});
      }
      if(path.startsWith('/api/')||req.method()!=='GET') return route.fulfill({json:{success:true}});
      return route.continue();
    });
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:/เริ่มเกมท้าทาย/}).click({timeout:15000});
    await page.getByRole('button',{name:'เล่นเสียงคำศัพท์'}).click();
    await page.getByRole('button',{name:'ability',exact:true}).click();
    await page.getByRole('button',{name:'ลองส่งคำตอบเดิม'}).click();
    await page.getByPlaceholder('พิมพ์สะกดคำศัพท์...').waitFor();
    assert.deepEqual(submissions[0],submissions[1]);
    await page.getByRole('button',{name:/Hint/}).click();
    await page.getByText(/คำใบ้: ขึ้นต้นด้วยตัว/).waitFor();
    await page.getByPlaceholder('พิมพ์สะกดคำศัพท์...').fill('wrong');
    await page.getByRole('button',{name:/ยืนยันคำตอบ/}).click();
    await page.getByText(/ตัวสะกดที่ถูกต้องคือ/).waitFor();
    await page.waitForFunction(()=>!document.querySelector('input[placeholder="พิมพ์สะกดคำศัพท์..."]'));
    assert.ok(audio>0); assert.equal(hints,1); assert.equal(complete,1);
    console.log('PASS protected campaign UI '+width+'px: retry same choice, server hint/feedback, opaque audio, final request has no raw answers');
    await context.close();
  }
} finally { await browser.close(); }
