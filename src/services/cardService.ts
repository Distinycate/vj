import { supabase } from '@/utils/supabase/client';

export const cardService = {
  /**
   * Fetch student's card inventory
   */
  async getStudentCards(studentId: string) {
    const { data, error } = await supabase
      .from('card_inventory')
      .select('*, cards(*)')
      .eq('student_id', studentId);
      
    if (error) throw error;
    return data || [];
  },

  /**
   * Perform a card draw (Gacha)
   */
  async drawCards(studentId: string, drawCount: number, useTicket: boolean = false) {
    const { data, error } = await supabase.rpc('draw_cards', {
      p_student_id: studentId,
      p_draw_count: drawCount,
      p_use_ticket: useTicket
    });

    if (error) throw error;
    return data;
  },

  /**
   * Disenchant duplicate cards for dust
   */
  async disenchantDuplicates(studentId: string) {
    const { data, error } = await supabase.rpc('disenchant_duplicate_cards', {
      p_student_id: studentId
    });

    if (error) throw error;
    return data;
  }
};
