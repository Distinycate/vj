import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

const purchaseSchema = z.object({
  itemId: z.string().uuid(),
  purchaseRequestId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const body = await request.json().catch(() => null);
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid purchase request payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { itemId, purchaseRequestId } = parsed.data;

    // Call atomic RPC with row-lock and purchaseRequestId idempotency
    const { data, error } = await supabaseAdmin.rpc('purchase_shop_item', {
      p_student_id: session.subjectId,
      p_item_id: itemId,
      p_purchase_request_id: purchaseRequestId,
    });

    if (error) {
      console.error('purchase_shop_item RPC error:', error);
      if (error.message?.includes('INSUFFICIENT_COINS')) {
        return NextResponse.json({ error: 'INSUFFICIENT_COINS' }, { status: 400 });
      }
      if (error.message?.includes('ITEM_NOT_FOUND')) {
        return NextResponse.json({ error: 'ITEM_NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json({ error: 'PURCHASE_FAILED' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newCoins: data.new_coins,
      newQuantity: data.new_quantity,
      alreadyPurchased: data.already_purchased || false,
      itemId,
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error?.status === 403 || error?.message === 'CROSS_ORIGIN_REQUEST_DENIED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Purchase route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
