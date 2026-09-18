import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const studentId = session.subjectId;
    const { searchParams } = new URL(request.url);
    const targetStudentId = searchParams.get('targetStudentId');

    // If querying target student's cards (e.g. for Thief/Ninja steal card modal)
    if (targetStudentId) {
      const { data: targetCards, error: targetErr } = await supabaseAdmin
        .from('card_inventory')
        .select('id, quantity, reserved_quantity, cards!inner(*)')
        .eq('student_id', targetStudentId)
        .gt('quantity', 0);

      if (targetErr) {
        return NextResponse.json({ error: targetErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        cards: targetCards || [],
      });
    }

    // Default: fetch student's own card center data
    const [
      { data: inventory },
      { data: schoolmates },
      { data: logs },
      { data: learningPath },
      { data: studentData },
      { data: notifications },
    ] = await Promise.all([
      supabaseAdmin
        .from('card_inventory')
        .select('id, quantity, reserved_quantity, cards(*)')
        .eq('student_id', studentId)
        .gt('quantity', 0),
      supabaseAdmin
        .from('students')
        .select('id, student_name, classroom_id, classrooms(class_name)')
        .neq('id', studentId)
        .eq('is_active', true)
        .order('student_name'),
      supabaseAdmin
        .from('card_logs')
        .select('*, attacker:attacker_id(student_name), target:target_id(student_name), played_card:played_card_id(*), counter_card:counter_card_id(*)')
        .or(`target_id.eq.${studentId},attacker_id.eq.${studentId}`)
        .order('created_at', { ascending: false })
        .limit(30),
      supabaseAdmin
        .from('learning_paths')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle(),
      supabaseAdmin
        .from('students')
        .select('id, student_name, active_defense_count, active_reflect_count')
        .eq('id', studentId)
        .maybeSingle(),
      supabaseAdmin
        .from('card_notifications')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const incoming = (logs || []).filter(l => l.target_id === studentId);
    const outgoing = (logs || []).filter(l => l.attacker_id === studentId);

    return NextResponse.json({
      success: true,
      inventory: inventory || [],
      schoolmates: schoolmates || [],
      incoming,
      outgoing,
      logs: logs || [],
      notifications: notifications || [],
      learningPath: learningPath || null,
      activeDefenseCount: Number(studentData?.active_defense_count || 0),
      activeReflectCount: Number(studentData?.active_reflect_count || 0),
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Student cards API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const studentId = session.subjectId;
    const body = await request.json();
    const { action, cardId, targetId, targetCardId, targetCard2Id, metadata } = body;

    if (action === 'use_card') {
      if (!cardId) {
        return NextResponse.json({ error: 'กรุณาระบุการ์ดที่ต้องการใช้' }, { status: 400 });
      }

      // Check student inventory
      const { data: inventoryItem, error: invErr } = await supabaseAdmin
        .from('card_inventory')
        .select('*, cards(*)')
        .eq('student_id', studentId)
        .eq('card_id', cardId)
        .maybeSingle();

      if (invErr || !inventoryItem || inventoryItem.quantity < 1) {
        return NextResponse.json({ error: 'ไม่พบการ์ดนี้ในคลังของคุณ หรือการ์ดหมดแล้ว' }, { status: 400 });
      }

      const card = inventoryItem.cards;
      const cardCode = card.card_code;
      const effectType = card.effect_type;

      // Deduct 1 card from attacker inventory
      const { error: deductErr } = await supabaseAdmin
        .from('card_inventory')
        .update({ quantity: inventoryItem.quantity - 1, updated_at: new Date().toISOString() })
        .eq('id', inventoryItem.id);

      if (deductErr) {
        return NextResponse.json({ error: 'ไม่สามารถหักการ์ดจากคลังได้' }, { status: 500 });
      }

      // 1. SELF-BUFF: SHIELD & REFLECT
      if (cardCode === 'SHIELD' || effectType === 'DEFENSE') {
        const { data: studentData } = await supabaseAdmin
          .from('students')
          .select('active_defense_count')
          .eq('id', studentId)
          .single();

        const newCount = (studentData?.active_defense_count || 0) + 1;
        await supabaseAdmin
          .from('students')
          .update({ active_defense_count: newCount })
          .eq('id', studentId);

        await supabaseAdmin.from('card_logs').insert({
          attacker_id: studentId,
          target_id: null,
          played_card_id: cardId,
          status: 'RESOLVED',
          final_result_text: 'กางโล่ป้องกันล่วงหน้าสำเร็จ (+1 โล่ป้องกัน)',
          teacher_executed: true,
        });

        return NextResponse.json({
          success: true,
          message: '🛡️ กางโล่ป้องกันสำเร็จ! (พร้อมป้องกันการโจมตี 1 ครั้ง)',
          activeDefenseCount: newCount,
        });
      }

      if (cardCode === 'REFLECT' || effectType === 'REFLECT') {
        const { data: studentData } = await supabaseAdmin
          .from('students')
          .select('active_reflect_count')
          .eq('id', studentId)
          .single();

        const newCount = (studentData?.active_reflect_count || 0) + 1;
        await supabaseAdmin
          .from('students')
          .update({ active_reflect_count: newCount })
          .eq('id', studentId);

        await supabaseAdmin.from('card_logs').insert({
          attacker_id: studentId,
          target_id: null,
          played_card_id: cardId,
          status: 'RESOLVED',
          final_result_text: 'กางโล่สะท้อนกลับล่วงหน้าสำเร็จ (+1 โล่สะท้อน)',
          teacher_executed: true,
        });

        return NextResponse.json({
          success: true,
          message: '🔄 กางโล่สะท้อนกลับสำเร็จ! (พร้อมสะท้อนการโจมตีกลับ 1 ครั้ง)',
          activeReflectCount: newCount,
        });
      }

      // 2. ANGEL: BUFF A FRIEND WITH SHIELD
      if (cardCode === 'ANGEL') {
        if (!targetId) {
          return NextResponse.json({ error: 'กรุณาเลือกเพื่อนที่ต้องการกางโล่ให้' }, { status: 400 });
        }

        const { data: targetData } = await supabaseAdmin
          .from('students')
          .select('id, student_name, active_defense_count')
          .eq('id', targetId)
          .single();

        if (targetData) {
          await supabaseAdmin
            .from('students')
            .update({ active_defense_count: (targetData.active_defense_count || 0) + 1 })
            .eq('id', targetId);
        }

        await supabaseAdmin.from('card_logs').insert({
          attacker_id: studentId,
          target_id: targetId,
          played_card_id: cardId,
          status: 'RESOLVED',
          final_result_text: `กางโล่ป้องกันให้ ${targetData?.student_name || 'เพื่อน'} สำเร็จ`,
          teacher_executed: true,
        });

        return NextResponse.json({
          success: true,
          message: `👼 มอบโล่ป้องกันให้ ${targetData?.student_name || 'เพื่อน'} สำเร็จ!`,
        });
      }

      // 3. BOMB: DESTROY UP TO 5 CARDS
      if (cardCode === 'BOMB') {
        if (!targetId) {
          return NextResponse.json({ error: 'กรุณาเลือกเป้าหมายที่จะระเบิด' }, { status: 400 });
        }

        const { data: targetData } = await supabaseAdmin
          .from('students')
          .select('id, student_name, active_defense_count, active_reflect_count')
          .eq('id', targetId)
          .single();

        if (!targetData) {
          return NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียนเป้าหมาย' }, { status: 404 });
        }

        // Check target reflect
        if ((targetData.active_reflect_count || 0) > 0) {
          await supabaseAdmin
            .from('students')
            .update({ active_reflect_count: targetData.active_reflect_count - 1 })
            .eq('id', targetId);

          // Bomb explodes attacker!
          const { data: attackerInv } = await supabaseAdmin
            .from('card_inventory')
            .select('id, quantity')
            .eq('student_id', studentId)
            .gt('quantity', 0);

          let destroyed = 0;
          for (const item of (attackerInv || [])) {
            if (destroyed >= 5) break;
            const toDeduct = Math.min(item.quantity, 5 - destroyed);
            await supabaseAdmin
              .from('card_inventory')
              .update({ quantity: item.quantity - toDeduct, updated_at: new Date().toISOString() })
              .eq('id', item.id);
            destroyed += toDeduct;
          }

          await supabaseAdmin.from('card_logs').insert({
            attacker_id: studentId,
            target_id: targetId,
            played_card_id: cardId,
            status: 'RESOLVED',
            final_result_text: `เป้าหมายสะท้อนการ์ดระเบิดกลับ! ระเบิดโดนผู้ใช้เอง ทำลายการ์ดไป ${destroyed} ใบ`,
            teacher_executed: true,
          });

          return NextResponse.json({
            success: true,
            message: `⚠️ โดนสะท้อนกลับ! ${targetData.student_name} มีโล่สะท้อน ระเบิดจึงทำลายการ์ดของคุณไป ${destroyed} ใบ`,
          });
        }

        // Check target defense
        if ((targetData.active_defense_count || 0) > 0) {
          await supabaseAdmin
            .from('students')
            .update({ active_defense_count: targetData.active_defense_count - 1 })
            .eq('id', targetId);

          await supabaseAdmin.from('card_logs').insert({
            attacker_id: studentId,
            target_id: targetId,
            played_card_id: cardId,
            status: 'REJECTED',
            final_result_text: `เป้าหมายใช้โล่ป้องกันการ์ดระเบิดไว้ได้!`,
            teacher_executed: true,
          });

          return NextResponse.json({
            success: true,
            message: `🛡️ ${targetData.student_name} มีโล่ป้องกัน การ์ดระเบิดถูกบล็อกไว้ได้!`,
          });
        }

        // Normal bomb effect: destroy up to 5 cards from target
        const { data: targetInv } = await supabaseAdmin
          .from('card_inventory')
          .select('id, quantity')
          .eq('student_id', targetId)
          .gt('quantity', 0);

        let destroyed = 0;
        for (const item of (targetInv || [])) {
          if (destroyed >= 5) break;
          const toDeduct = Math.min(item.quantity, 5 - destroyed);
          await supabaseAdmin
            .from('card_inventory')
            .update({ quantity: item.quantity - toDeduct, updated_at: new Date().toISOString() })
            .eq('id', item.id);
          destroyed += toDeduct;
        }

        await supabaseAdmin.from('card_logs').insert({
          attacker_id: studentId,
          target_id: targetId,
          played_card_id: cardId,
          status: 'RESOLVED',
          final_result_text: `ระเบิดการ์ดเป้าหมายทิ้งสำเร็จ (ทำลาย ${destroyed} ใบ)`,
          teacher_executed: true,
        });

        if (destroyed > 0 && targetId) {
          await supabaseAdmin.from('card_notifications').insert({
            student_id: targetId,
            notification_type: 'CARD_DESTROYED',
            title: '💣 คลังการ์ดของคุณถูกระเบิด!',
            message: `คุณถูกเพื่อนใช้การ์ดระเบิด ทำลายการ์ดในคลังไป ${destroyed} ใบ`,
            data: { destroyedCount: destroyed, attackerId: studentId },
          });
        }

        return NextResponse.json({
          success: true,
          message: `💣 บึ้ม! ระเบิดการ์ดของ ${targetData.student_name} ทิ้งไป ${destroyed} ใบ!`,
          destroyed_count: destroyed,
        });
      }

      // 4. NINJA: DESTROY SPECIFIC 1 OR 2 CARDS
      if (cardCode === 'NINJA') {
        if (!targetId || !targetCardId) {
          return NextResponse.json({ error: 'กรุณาเลือกการ์ดของเพื่อนที่ต้องการทำลาย' }, { status: 400 });
        }

        const { data: targetData } = await supabaseAdmin
          .from('students')
          .select('id, student_name, active_defense_count, active_reflect_count')
          .eq('id', targetId)
          .single();

        if (!targetData) {
          return NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียนเป้าหมาย' }, { status: 404 });
        }

        // Check reflect
        if ((targetData.active_reflect_count || 0) > 0) {
          await supabaseAdmin
            .from('students')
            .update({ active_reflect_count: targetData.active_reflect_count - 1 })
            .eq('id', targetId);

          await supabaseAdmin.from('card_logs').insert({
            attacker_id: studentId,
            target_id: targetId,
            played_card_id: cardId,
            status: 'RESOLVED',
            final_result_text: `เป้าหมายสะท้อนการโจมตีของนินจา ป้องกันการ์ดไว้ได้`,
            teacher_executed: true,
          });

          return NextResponse.json({
            success: true,
            message: `🔄 ${targetData.student_name} ใช้โล่สะท้อน การลอบทำลายจึงไร้ผล!`,
          });
        }

        // Check defense
        if ((targetData.active_defense_count || 0) > 0) {
          await supabaseAdmin
            .from('students')
            .update({ active_defense_count: targetData.active_defense_count - 1 })
            .eq('id', targetId);

          await supabaseAdmin.from('card_logs').insert({
            attacker_id: studentId,
            target_id: targetId,
            played_card_id: cardId,
            status: 'REJECTED',
            final_result_text: `เป้าหมายใช้โล่ป้องกันการโจมตีของนินจาไว้ได้`,
            teacher_executed: true,
          });

          return NextResponse.json({
            success: true,
            message: `🛡️ ${targetData.student_name} ใช้โล่ป้องกัน การลอบทำลายถูกสกัดกั้น!`,
          });
        }

        // Normal ninja effect: deduct chosen cards
        const targetCardIds = [targetCardId, targetCard2Id].filter(Boolean) as string[];
        let destroyedCount = 0;
        for (const cId of targetCardIds) {
          const { data: invRow } = await supabaseAdmin
            .from('card_inventory')
            .select('id, quantity')
            .eq('student_id', targetId)
            .eq('card_id', cId)
            .gt('quantity', 0)
            .maybeSingle();

          if (invRow && invRow.quantity > 0) {
            await supabaseAdmin
              .from('card_inventory')
              .update({ quantity: invRow.quantity - 1, updated_at: new Date().toISOString() })
              .eq('id', invRow.id);
            destroyedCount++;
          }
        }

        await supabaseAdmin.from('card_logs').insert({
          attacker_id: studentId,
          target_id: targetId,
          played_card_id: cardId,
          status: 'RESOLVED',
          final_result_text: `นินจาลอบทำลายการ์ดเป้าหมายทิ้งสำเร็จ (${destroyedCount} ใบ)`,
          teacher_executed: true,
        });

        if (destroyedCount > 0 && targetId) {
          await supabaseAdmin.from('card_notifications').insert({
            student_id: targetId,
            notification_type: 'CARD_DESTROYED',
            title: '🥷 นินจาลอบทำลายการ์ดของคุณ!',
            message: `การ์ดในคลังของคุณถูกนินจาลอบทำลายไป ${destroyedCount} ใบ`,
            data: { destroyedCount, attackerId: studentId },
          });
        }

        return NextResponse.json({
          success: true,
          message: `🥷 สำเร็จ! นินจาลอบทำลายการ์ดของ ${targetData.student_name} ทิ้งไป ${destroyedCount} ใบ`,
        });
      }

      // 5. THIEF_RANDOM & THIEF_MASTER
      if (cardCode === 'THIEF_RANDOM' || cardCode === 'THIEF_MASTER') {
        let actualTargetId = targetId;

        // If random thief without target, pick a random student who has stealable cards
        if (!actualTargetId) {
          const { data: eligible } = await supabaseAdmin
            .from('card_inventory')
            .select('student_id, card_id, quantity, cards!inner(can_be_stolen, rarity)')
            .neq('student_id', studentId)
            .gt('quantity', 0)
            .eq('cards.can_be_stolen', true)
            .limit(50);

          if (!eligible || eligible.length === 0) {
            return NextResponse.json({ error: 'ไม่พบคลังของเพื่อนที่สามารถขโมยได้ในขณะนี้' }, { status: 400 });
          }

          const randomPick = eligible[Math.floor(Math.random() * eligible.length)];
          actualTargetId = randomPick.student_id;
        }

        const { data: targetData } = await supabaseAdmin
          .from('students')
          .select('id, student_name, active_defense_count, active_reflect_count')
          .eq('id', actualTargetId)
          .single();

        if (!targetData) {
          return NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียนเป้าหมาย' }, { status: 404 });
        }

        // Check shields
        if ((targetData.active_reflect_count || 0) > 0) {
          await supabaseAdmin
            .from('students')
            .update({ active_reflect_count: targetData.active_reflect_count - 1 })
            .eq('id', actualTargetId);

          await supabaseAdmin.from('card_logs').insert({
            attacker_id: studentId,
            target_id: actualTargetId,
            played_card_id: cardId,
            status: 'RESOLVED',
            final_result_text: `เป้าหมายสะท้อนการขโมย! การขโมยล้มเหลว`,
            teacher_executed: true,
          });

          return NextResponse.json({
            success: true,
            message: `🔄 ${targetData.student_name} มีโล่สะท้อน การขโมยถูกสะท้อนกลับ!`,
          });
        }

        if ((targetData.active_defense_count || 0) > 0) {
          await supabaseAdmin
            .from('students')
            .update({ active_defense_count: targetData.active_defense_count - 1 })
            .eq('id', actualTargetId);

          await supabaseAdmin.from('card_logs').insert({
            attacker_id: studentId,
            target_id: actualTargetId,
            played_card_id: cardId,
            status: 'REJECTED',
            final_result_text: `เป้าหมายใช้โล่ป้องกันการขโมยไว้ได้`,
            teacher_executed: true,
          });

          return NextResponse.json({
            success: true,
            message: `🛡️ ${targetData.student_name} ใช้โล่ป้องกัน การขโมยถูกสกัดไว้ได้!`,
          });
        }

        // Find card to steal
        let stealCardId = targetCardId;
        if (!stealCardId) {
          const { data: targetCards } = await supabaseAdmin
            .from('card_inventory')
            .select('card_id, quantity, cards!inner(id, name, can_be_stolen)')
            .eq('student_id', actualTargetId)
            .gt('quantity', 0)
            .eq('cards.can_be_stolen', true);

          if (!targetCards || targetCards.length === 0) {
            return NextResponse.json({ error: 'เพื่อนคนนี้ไม่มีการ์ดที่สามารถขโมยได้' }, { status: 400 });
          }
          const chosen = targetCards[Math.floor(Math.random() * targetCards.length)];
          stealCardId = chosen.card_id;
        }

        // Deduct from target
        const { data: targetItem } = await supabaseAdmin
          .from('card_inventory')
          .select('id, quantity')
          .eq('student_id', actualTargetId)
          .eq('card_id', stealCardId)
          .gt('quantity', 0)
          .maybeSingle();

        if (targetItem && targetItem.quantity > 0) {
          await supabaseAdmin
            .from('card_inventory')
            .update({ quantity: targetItem.quantity - 1, updated_at: new Date().toISOString() })
            .eq('id', targetItem.id);

          // Add to attacker
          const { data: attackerExisting } = await supabaseAdmin
            .from('card_inventory')
            .select('id, quantity')
            .eq('student_id', studentId)
            .eq('card_id', stealCardId)
            .maybeSingle();

          if (attackerExisting) {
            await supabaseAdmin
              .from('card_inventory')
              .update({ quantity: attackerExisting.quantity + 1, updated_at: new Date().toISOString() })
              .eq('id', attackerExisting.id);
          } else {
            await supabaseAdmin
              .from('card_inventory')
              .insert({ student_id: studentId, card_id: stealCardId, quantity: 1 });
          }
        }

        const { data: stolenCardInfo } = await supabaseAdmin
          .from('cards')
          .select('name')
          .eq('id', stealCardId)
          .single();

        await supabaseAdmin.from('card_logs').insert({
          attacker_id: studentId,
          target_id: actualTargetId,
          played_card_id: cardId,
          status: 'RESOLVED',
          final_result_text: `ขโมยการ์ด "${stolenCardInfo?.name || 'การ์ด'}" จากเป้าหมายสำเร็จ`,
          teacher_executed: true,
        });

        return NextResponse.json({
          success: true,
          message: `🎯 ขโมยสำเร็จ! คุณได้การ์ด "${stolenCardInfo?.name || 'การ์ด'}" มาจาก ${targetData.student_name} แล้ว!`,
          stolen_card_name: stolenCardInfo?.name,
        });
      }

      // 6. EARLY_HOME: PENDING TEACHER APPROVAL
      if (cardCode === 'EARLY_HOME') {
        await supabaseAdmin.from('card_logs').insert({
          attacker_id: studentId,
          target_id: null,
          played_card_id: cardId,
          status: 'PENDING',
          final_result_text: 'ส่งคำขอกลับบ้านก่อน รอครูอนุมัติ',
          teacher_executed: false,
        });

        return NextResponse.json({
          success: true,
          message: '📨 ส่งคำขอกลับบ้านก่อนแล้ว รอคุณครูอนุมัติ',
        });
      }

      // 7. GENERAL ATTACK OR TASK CARDS (CLEAN_ROOM, MEDITATE_10, PICK_TRASH, CLEAN_CLASS)
      if (effectType === 'ATTACK') {
        const { data: targetData } = await supabaseAdmin
          .from('students')
          .select('id, student_name, active_defense_count, active_reflect_count')
          .eq('id', targetId || studentId)
          .single();

        // Check target reflect
        if (targetId && targetData && (targetData.active_reflect_count || 0) > 0) {
          await supabaseAdmin
            .from('students')
            .update({ active_reflect_count: targetData.active_reflect_count - 1 })
            .eq('id', targetId);

          await supabaseAdmin.from('card_logs').insert({
            attacker_id: studentId,
            target_id: targetId,
            played_card_id: cardId,
            metadata: metadata || {},
            status: 'RESOLVED',
            final_result_text: `เป้าหมายสะท้อนการโจมตีกลับ! ผลคำสั่งสะท้อนเข้าหาผู้ใช้`,
            teacher_executed: false,
          });

          return NextResponse.json({
            success: true,
            message: `🔄 ${targetData.student_name} มีโล่สะท้อน คำสั่งจึงสะท้อนกลับมาที่คุณ!`,
          });
        }

        // Check target defense
        if (targetId && targetData && (targetData.active_defense_count || 0) > 0) {
          await supabaseAdmin
            .from('students')
            .update({ active_defense_count: targetData.active_defense_count - 1 })
            .eq('id', targetId);

          await supabaseAdmin.from('card_logs').insert({
            attacker_id: studentId,
            target_id: targetId,
            played_card_id: cardId,
            metadata: metadata || {},
            status: 'REJECTED',
            final_result_text: `เป้าหมายใช้โล่ป้องกันคำสั่งไว้ได้`,
            teacher_executed: true,
          });

          return NextResponse.json({
            success: true,
            message: `🛡️ ${targetData.student_name} ใช้โล่ป้องกันคำสั่งไว้ได้!`,
          });
        }

        // Normal attack execution
        await supabaseAdmin.from('card_logs').insert({
          attacker_id: studentId,
          target_id: targetId || null,
          played_card_id: cardId,
          metadata: metadata || {},
          status: 'RESOLVED',
          final_result_text: `ใช้การ์ด ${card.name} สำเร็จ`,
          teacher_executed: false,
        });

        return NextResponse.json({
          success: true,
          message: `✨ ใช้การ์ด "${card.name}" สำเร็จ!`,
        });
      }

      // 8. DEMON_TEACHER: TRAP CARD (DESTROYS 10 CARDS OF THE USER)
      if (cardCode === 'DEMON_TEACHER') {
        const { data: ownInv } = await supabaseAdmin
          .from('card_inventory')
          .select('id, quantity')
          .eq('student_id', studentId)
          .gt('quantity', 0);

        let destroyed = 0;
        for (const item of (ownInv || [])) {
          if (destroyed >= 10) break;
          const toDeduct = Math.min(item.quantity, 10 - destroyed);
          await supabaseAdmin
            .from('card_inventory')
            .update({ quantity: item.quantity - toDeduct, updated_at: new Date().toISOString() })
            .eq('id', item.id);
          destroyed += toDeduct;
        }

        await supabaseAdmin.from('card_logs').insert({
          attacker_id: studentId,
          target_id: null,
          played_card_id: cardId,
          status: 'RESOLVED',
          final_result_text: `คำสาปครูปีศาจทำงาน! การ์ดในคลังของผู้ใช้ถูกทำลายไป ${destroyed} ใบ`,
          teacher_executed: true,
        });

        await supabaseAdmin.from('card_notifications').insert({
          student_id: studentId,
          notification_type: 'CARD_ALERT',
          title: '👹 คำสาปครูปีศาจ!',
          message: `คำสาปครูปีศาจทำงาน! การ์ดในคลังของคุณถูกทำลายไป ${destroyed} ใบ`,
        });

        return NextResponse.json({
          success: true,
          message: `👹 คำสาปครูปีศาจทำงาน! การ์ดในคลังของคุณถูกทำลายไป ${destroyed} ใบ!`,
          destroyed_count: destroyed,
        });
      }

      // 9. DUD CARDS (DUD_SALT)
      await supabaseAdmin.from('card_logs').insert({
        attacker_id: studentId,
        target_id: null,
        played_card_id: cardId,
        status: 'RESOLVED',
        final_result_text: 'การ์ดไม่มีผลใดๆ เกิดขึ้น',
        teacher_executed: true,
      });

      return NextResponse.json({
        success: true,
        message: `ใช้งานการ์ด "${card.name}" แล้ว (ไม่มีผลใดๆ)`,
      });
    }

    if (action === 'trigger_decay') {
      // Card decay is permanently disabled to protect student cards
      return NextResponse.json({
        success: true,
        decayedCount: 0,
        reason: 'ระบบปิดการสลายตัวของการ์ด (Card Decay Disabled)',
      });
    }

    if (action === 'dismiss_notification') {
      const { notificationId } = body;
      if (notificationId) {
        await supabaseAdmin
          .from('card_notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('student_id', studentId);
      } else {
        await supabaseAdmin
          .from('card_notifications')
          .update({ is_read: true })
          .eq('student_id', studentId);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Execute card error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
