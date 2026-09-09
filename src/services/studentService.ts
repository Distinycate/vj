import { supabase } from '@/utils/supabase/client';

export const studentService = {
  /**
   * Fetch words due for spaced repetition review
   */
  async getReviewWords(studentId: string) {
    const { data, error } = await supabase
      .from('user_review_words')
      .select('*, vocabulary:word_id(*)')
      .eq('user_id', studentId)
      .lt('mastery_level', 4)
      .lte('next_review_at', new Date().toISOString())
      .order('next_review_at', { ascending: true });

    if (error) throw error;
    return data?.map((r: any) => r.vocabulary).filter(Boolean) || [];
  },

  /**
   * Fetch all words ever encountered (Word Collection)
   */
  async getWordCollection(studentId: string) {
    const { data, error } = await supabase
      .from('user_review_words')
      .select('*, vocabulary:word_id(*)')
      .eq('user_id', studentId)
      .order('mastery_level', { ascending: false });

    if (error) throw error;
    return data?.filter((c: any) => c.vocabulary) || [];
  },

  /**
   * Fetch Learning Path
   */
  async getLearningPath(studentId: string) {
    const { data, error } = await supabase
      .from('learning_paths')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch Gameplay Accuracy and Stage Stars
   */
  async getGameplayStats(studentId: string) {
    const [{ data: stageResultRows, error: stageError }, { data: attemptRows, error: attemptError }] = await Promise.all([
      supabase
        .from('stage_results')
        .select('stage_number, accuracy, stars, passed')
        .eq('user_id', studentId),
      supabase
        .from('attempts')
        .select('score, total_questions, is_passed, stages(stage_number)')
        .eq('student_id', studentId),
    ]);

    if (stageError) throw stageError;
    if (attemptError) throw attemptError;

    return { stageResultRows, attemptRows };
  },

  /**
   * Fetch Messages
   */
  async getMessages(studentId: string) {
    const { data, error } = await supabase
      .from('student_messages')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(messageIds: string[]) {
    if (messageIds.length === 0) return;
    const { error } = await supabase
      .from('student_messages')
      .update({ is_read: true })
      .in('id', messageIds);

    if (error) throw error;
  },

  /**
   * Fetch Daily Quests
   */
  async getDailyQuests(studentId: string) {
    const { data, error } = await supabase
      .from('student_daily_quests')
      .select('*, daily_quests(*)')
      .eq('student_id', studentId)
      .eq('quest_date', new Date().toISOString().split('T')[0]);

    if (error) throw error;
    return data;
  }
};
