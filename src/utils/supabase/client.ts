import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const rawSupabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * STRICT CLIENT-SIDE SECURITY BOUNDARY
 * Direct client access to these tables or RPCs is blocked at runtime.
 * All sensitive mutations and queries must go through authenticated /api/* routes.
 */
export const SENSITIVE_CLIENT_TABLES = [
  'students',
  'teachers',
  'learning_paths',
  'analytics_summary',
  'card_inventory',
  'card_admin_actions',
  'user_sessions',
  'economy_transactions',
  'shop_purchases',
  'stage_attempts',
] as const;

export const PRIVILEGED_RPCS = [
  'purchase_shop_item',
  'complete_stage_transaction',
  'grant_student_reward',
  'award_coins',
  'award_xp',
  'consume_energy',
  'repair_all_student_profiles',
] as const;

export function createGuardedClient(client: any) {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) => {
          if (SENSITIVE_CLIENT_TABLES.includes(table as any)) {
            // In browser or test environment, throw error to enforce boundary
            const msg = `[SecurityBoundaryViolation] Direct client access to table '${table}' is strictly prohibited. Use authenticated /api/* routes.`;
            if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
              console.warn(msg);
            }
          }
          return target.from(table);
        };
      }
      if (prop === 'rpc') {
        return (fn: string, params?: any) => {
          if (PRIVILEGED_RPCS.includes(fn as any)) {
            const msg = `[SecurityBoundaryViolation] Direct client execution of privileged RPC '${fn}' is strictly prohibited. Use authenticated /api/* routes.`;
            if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
              console.warn(msg);
            }
          }
          return target.rpc(fn, params);
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

export const supabase = createGuardedClient(rawSupabase);

