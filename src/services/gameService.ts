import { supabase } from '@/utils/supabase/client';

export const gameService = {
  /**
   * Fetch stage content and questions
   */
  async getStageData(stageNumber: number) {
    const { data, error } = await supabase
      .from('stages')
      .select('*, stage_questions(*)')
      .eq('stage_number', stageNumber)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch items in inventory (for use in game)
   */
  async getInventory(studentId: string) {
    const { data, error } = await supabase
      .from('student_inventory')
      .select('*, items(*)')
      .eq('student_id', studentId)
      .gt('quantity', 0);
      
    if (error) throw error;
    return data || [];
  }
};
