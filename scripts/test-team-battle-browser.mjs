// Run against a local Next server. No request reaches a real school database.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true });
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3117';
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const progress = { current_stage:1,current_rank:1,coins:0,exp:0,total_exp:0,pretest_date:'2026-11-23T00:00:00Z' };
const makeTeam = (n,name,school=false) => ({
  id:id(n),team_name:name,team_icon:'🦁',team_color:'#f59e0b',
  team_type:school?'school':'class',classroom_id:school?null:id(7),
  rank:1,totalScore:20,finalScore:130,activeMembersRate:100,totalMembers:1,activeMembersCount:1,eventsCount:2,
});
const classTeam = makeTeam(2,'Fixture Classroom Team');
const schoolTeam = makeTeam(3,'Fixture School Team',true);
try {
  for (const width of [390,1440]) {
    const context = await browser.newContext({ viewport:{width,height:900}, serviceWorkers:'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    let classroomRequests=0, schoolRequests=0, membershipRequests=0;
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      if (url.origin !== base) return route.fulfill({ json:[] });
      if (path === '/api/auth/me') return route.fulfill({ json:{
        authenticated:true,role:'STUDENT',
        user:{id:id(1),student_name:'Fixture',userType:'INTERNAL',classroomId:id(7),is_verified:true},progress,
      } });
      if (path === '/api/student/progression') return route.fulfill({ json:{ authority:'V3',currentStage:1,unlockedStages:[1],completedStages:[] } });
      if (path === '/api/student/profile') return route.fulfill({ json:{ success:true,learningPath:progress } });
      if (path === '/api/student/coop-goals') return route.fulfill({ status:503,json:{ success:false } });
      if (path === '/api/team-battle/mine') {
        assert.equal(req.method(),'POST');
        membershipRequests++;
        return route.fulfill({ json:{ teams:[classTeam,schoolTeam] } });
      }
      if (path === '/api/team-battle/leaderboard') {
        if (url.searchParams.get('scope') === 'classroom') {
          assert.equal(url.searchParams.get('classroomId'),id(7));
          if (++classroomRequests === 1) return route.fulfill({ status:503,json:{ error:'โหลดตารางคะแนนไม่สำเร็จ กรุณาลองใหม่' } });
          return route.fulfill({ json:{ season:{id:id(8),name:'Fixture Classroom Season',active:true},teams:[classTeam] } });
        }
        assert.equal(url.searchParams.get('scope'),'school');
        assert.equal(url.searchParams.has('classroomId'),false);
        schoolRequests++;
        return route.fulfill({ json:{ season:{id:id(9),name:'Fixture School Season',active:true},teams:[schoolTeam] } });
      }
      if (path.startsWith('/api/') || req.method() !== 'GET') return route.fulfill({ json:{ success:true } });
      return route.continue();
    });
    await page.goto(base+'/', { waitUntil:'domcontentloaded' });
    await page.getByRole('button',{name:'ภารกิจ & ทีม'}).click({ timeout:15000 });
    await page.getByRole('button',{name:'แรงกิ้ง & อันดับ'}).click();
    await page.getByText('โหลดตารางคะแนนไม่สำเร็จ กรุณาลองใหม่').waitFor();
    await page.getByRole('button',{name:'ลองใหม่',exact:true}).click();
    await page.getByText('ฤดูกาล: Fixture Classroom Season').waitFor();
    await page.getByRole('heading',{name:/Fixture Classroom Team/}).waitFor();
    assert.equal(await page.getByText('Fixture School Season',{exact:false}).count(),0);
    await page.getByRole('button',{name:'ทีมของฉัน',exact:true}).click();
    await page.getByText('ฤดูกาล: Fixture School Season').waitFor();
    await page.getByRole('heading',{name:/Fixture School Team/}).first().waitFor();
    assert.ok(classroomRequests >= 2 && schoolRequests >= 1 && membershipRequests === 1);
    console.log('PASS Team Battle browser '+width+'px: room scope, retry, and own/school team views');
    await context.close();
  }
} finally { await browser.close(); }
