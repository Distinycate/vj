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
   * Save gameplay results
   */
  async saveStageResult(payload: {
    studentId: string;
    stageNumber: number;
    score: number;
    totalQuestions: number;
    accuracy: number;
    isPassed: boolean;
    stars: number;
  }) {
    // Determine if it's a new personal best or first pass
    const { data: existingResult } = await supabase
      .from('stage_results')
      .select('stars, score')
      .eq('user_id', payload.studentId)
      .eq('stage_number', payload.stageNumber)
      .single();

    const isFirstPass = !existingResult && payload.isPassed;
    const isNewBest = existingResult && payload.stars > existingResult.stars;

    const { data, error } = await supabase.rpc('save_stage_result', {
      p_user_id: payload.studentId,
      p_stage_number: payload.stageNumber,
      p_score: payload.score,
      p_total_questions: payload.totalQuestions,
      p_accuracy: payload.accuracy,
      p_passed: payload.isPassed,
      p_stars: payload.stars
    });

    if (error) throw error;
    return { data, isFirstPass, isNewBest };
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
