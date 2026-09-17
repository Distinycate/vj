import { NextResponse } from 'next/server';
import { requireRole, requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET(request: Request) {
  try {
    await requireRole(['TEACHER', 'ADMIN', 'CARD_TEACHER', 'EXECUTIVE']);
    const { data: seasons, error } = await supabaseAdmin
      .from('team_battle_seasons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, seasons: seasons || [] });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(['TEACHER', 'ADMIN', 'CARD_TEACHER', 'EXECUTIVE']);
    const teacherId = session.subjectId;
    const body = await request.json();
    const { action, seasonName, seasonId } = body;

    // 1. Create / Start new season
    if (action === 'create') {
      if (!seasonName || typeof seasonName !== 'string' || !seasonName.trim()) {
        return NextResponse.json({ error: 'กรุณาระบุชื่อฤดูกาล' }, { status: 400 });
      }

      // Close all active seasons first
      await supabaseAdmin
        .from('team_battle_seasons')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('is_active', true);

      // Create new active season
      const { data: newSeason, error: createErr } = await supabaseAdmin
        .from('team_battle_seasons')
        .insert({
          season_name: seasonName.trim(),
          scope: 'school',
          status: 'ACTIVE',
          is_active: true,
          created_by_id: teacherId,
        })
        .select()
        .single();

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, season: newSeason });
    }

    // 2. Close & Reward Top 3 + Penalize Bottom 3 teams
    if (action === 'close_and_reward') {
      if (!seasonId) {
        return NextResponse.json({ error: 'กรุณาระบุ Season ID' }, { status: 400 });
      }

      const { data: season, error: seasonErr } = await supabaseAdmin
        .from('team_battle_seasons')
        .select('*')
        .eq('id', seasonId)
        .single();

      if (seasonErr || !season) {
        return NextResponse.json({ error: 'ไม่พบข้อมูลฤดูกาลนี้' }, { status: 404 });
      }

      if (season.status === 'REWARDED') {
        return NextResponse.json({ error: 'ฤดูกาลนี้ได้ทำการแจกรางวัลและปิดไปแล้ว' }, { status: 400 });
      }

      // Fetch active teams for this season's scope
      const { data: teams, error: teamsErr } = await supabaseAdmin
        .from('teams')
        .select('id, team_name, team_type')
        .eq('is_active', true)
        .eq('team_type', season.scope === 'school' ? 'school' : 'class');

      if (teamsErr || !teams || teams.length === 0) {
        return NextResponse.json({ error: 'ไม่พบทีมที่เข้าเกณฑ์ในระบบ' }, { status: 400 });
      }

      // Calculate score for each team in this season
      const { data: scoreEvents } = await supabaseAdmin
        .from('team_score_events')
        .select('team_id, points')
        .eq('season_id', season.id);

      const teamScoresMap: Record<string, number> = {};
      for (const t of teams) {
        teamScoresMap[t.id] = 0;
      }
      for (const ev of (scoreEvents || [])) {
        if (teamScoresMap[ev.team_id] !== undefined) {
          teamScoresMap[ev.team_id] += Number(ev.points || 0);
        }
      }

      // Rank teams descending
      const rankedTeams = [...teams].map(t => ({
        ...t,
        score: teamScoresMap[t.id] || 0,
      })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

      const top3Teams = rankedTeams.slice(0, Math.min(3, rankedTeams.length));
      
      // Bottom 3 teams: lowest score first (exclude top 3 if more than 3 teams total)
      const eligibleForPenalty = rankedTeams.length > 3
        ? rankedTeams.slice(Math.max(3, rankedTeams.length - 3)).reverse() // reverse so lowest score is first
        : [];

      const rewardResults: any[] = [];
      const penaltyResults: any[] = [];

      // A. Distribute Rewards to Top 3
      const topTicketAmounts = season.scope === 'school' ? [10, 7, 5] : [3, 2, 1];
      for (let i = 0; i < top3Teams.length; i++) {
        const team = top3Teams[i];
        const rank = i + 1;
        const tickets = topTicketAmounts[i] || 1;

        // Fetch active members
        const { data: members } = await supabaseAdmin
          .from('team_members')
          .select('user_id')
          .eq('team_id', team.id)
          .eq('is_active', true);

        const memberIds = (members || []).map(m => m.user_id);

        for (const mId of memberIds) {
          // Record distribution
          await supabaseAdmin
            .from('season_reward_distributions')
            .upsert({
              season_id: season.id,
              team_id: team.id,
              student_id: mId,
              ticket_amount: tickets,
              awarded_by_id: teacherId,
            }, { onConflict: 'season_id,student_id' });

          // Increment student free_pull_tickets
          const { data: lp } = await supabaseAdmin
            .from('learning_paths')
            .select('free_pull_tickets')
            .eq('student_id', mId)
            .maybeSingle();

          if (lp) {
            await supabaseAdmin
              .from('learning_paths')
              .update({ free_pull_tickets: (lp.free_pull_tickets || 0) + tickets })
              .eq('student_id', mId);
          }

          // Send notification
          await supabaseAdmin.from('card_notifications').insert({
            student_id: mId,
            notification_type: 'SEASON_REWARD',
            title: '🏆 รางวัล Team Battle!',
            message: `ยินดีด้วย! ทีม ${team.team_name} ได้อันดับที่ ${rank} ในฤดูกาล ${season.season_name} ได้รับตั๋วสุ่มการ์ดฟรี ${tickets} ใบ!`,
            data: {
              teamName: team.team_name,
              season: season.season_name,
              rank,
              reward: { type: 'FREE_PULL_TICKET', amount: tickets },
            },
          });
        }

        rewardResults.push({
          teamName: team.team_name,
          rank,
          score: team.score,
          ticketsAwarded: tickets,
          membersCount: memberIds.length,
        });
      }

      // B. Apply Penalty to Bottom 3 teams (Deduct cards)
      // Rank 1 from bottom (อันดับสุดท้าย): -3 cards
      // Rank 2 from bottom (อันดับรองสุดท้าย): -2 cards
      // Rank 3 from bottom (อันดับ 3 จากท้าย): -1 card
      const bottomPenaltyAmounts = [3, 2, 1];
      for (let i = 0; i < eligibleForPenalty.length; i++) {
        const team = eligibleForPenalty[i];
        const penaltyCount = bottomPenaltyAmounts[i] || 1;

        // Fetch active members
        const { data: members } = await supabaseAdmin
          .from('team_members')
          .select('user_id')
          .eq('team_id', team.id)
          .eq('is_active', true);

        const memberIds = (members || []).map(m => m.user_id);

        for (const mId of memberIds) {
          // Find student's card inventory
          const { data: inv } = await supabaseAdmin
            .from('card_inventory')
            .select('id, quantity')
            .eq('student_id', mId)
            .gt('quantity', 0);

          let removed = 0;
          for (const item of (inv || [])) {
            if (removed >= penaltyCount) break;
            const toDeduct = Math.min(item.quantity, penaltyCount - removed);
            await supabaseAdmin
              .from('card_inventory')
              .update({ quantity: item.quantity - toDeduct, updated_at: new Date().toISOString() })
              .eq('id', item.id);
            removed += toDeduct;
          }

          // Send penalty notification
          await supabaseAdmin.from('card_notifications').insert({
            student_id: mId,
            notification_type: 'SEASON_PENALTY',
            title: '⚠️ บทลงโทษ Team Battle',
            message: `ทีม ${team.team_name} ได้อันดับท้ายในฤดูกาล ${season.season_name} จึงถูกทำโทษด้วยการริบการ์ด ${removed} ใบ`,
            data: {
              teamName: team.team_name,
              season: season.season_name,
              penaltyCards: penaltyCount,
              actualRemoved: removed,
            },
          });
        }

        penaltyResults.push({
          teamName: team.team_name,
          score: team.score,
          penaltyCardsPerMember: penaltyCount,
          membersCount: memberIds.length,
        });
      }

      // Mark season closed and rewarded
      await supabaseAdmin
        .from('team_battle_seasons')
        .update({
          status: 'REWARDED',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', season.id);

      return NextResponse.json({
        success: true,
        season_id: season.id,
        rewards: rewardResults,
        penalties: penaltyResults,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Season action error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
