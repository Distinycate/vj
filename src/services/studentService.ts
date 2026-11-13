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
      .gt('wrong_count', 0)
      .lt('mastery_level', 4)
      .lte('next_review_at', new Date().toISOString())
      .order('wrong_count', { ascending: false })
      .order('next_review_at', { ascending: true })
      .limit(30);

    if (error) throw error;
    return data?.map((r: any) => {
      const vocab = Array.isArray(r.vocabulary) ? r.vocabulary[0] : r.vocabulary;
      if (!vocab) return null;
      return {
        ...vocab,
        wrong_count: r.wrong_count || 1,
        last_wrong_at: r.last_wrong_at,
      };
    }).filter(Boolean) || [];
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
  async getLearningPath(studentId?: string) {
    const res = await fetch(`/api/student/profile${studentId ? `?studentId=${studentId}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch learning path');
    const data = await res.json();
    return data.learningPath;
  },

  /**
   * Fetch Gameplay Accuracy and Stage Stars
   */
  async getGameplayStats() {
    const res = await fetch('/api/student/progression');
    if (!res.ok) throw new Error('Failed to fetch gameplay stats');
    const data = await res.json();
    return {
      completedStages: data.completedStages,
      globalAccuracy: data.globalAccuracy,
      currentStage: data.currentStage,
      unlockedStages: data.unlockedStages,
    };
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
