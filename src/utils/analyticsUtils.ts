export function calculateLearningGain(preTestScore: number, postTestScore: number) {
  const gain = postTestScore - preTestScore;
  const percentage = preTestScore > 0 
    ? (gain / preTestScore) * 100 
    : (postTestScore > 0 ? 100 : 0);
  
  return {
    gain,
    percentage: Math.round(percentage)
  };
}

export function calculateMasteryRate(masteredWords: number, totalStudiedWords: number) {
  if (totalStudiedWords === 0) return 0;
  return Math.round((masteredWords / totalStudiedWords) * 100);
}

export function calculateRiskScore(params: {
  accuracy: number;
  daysInactive: number;
  reviewWords: number;
  stageStagnationDays: number;
}) {
  let riskScore = 0;
  
  // Accuracy risk
  if (params.accuracy < 50) riskScore += 40;
  else if (params.accuracy < 70) riskScore += 20;

  // Inactivity risk
  if (params.daysInactive > 7) riskScore += 30;
  else if (params.daysInactive > 3) riskScore += 10;

  // Review burden risk
  if (params.reviewWords > 50) riskScore += 20;
  else if (params.reviewWords > 20) riskScore += 10;

  // Stagnation risk
  if (params.stageStagnationDays > 5) riskScore += 10;

  return Math.min(riskScore, 100);
}

export function getRiskLevel(riskScore: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (riskScore >= 70) return 'Critical';
  if (riskScore >= 50) return 'High';
  if (riskScore >= 30) return 'Medium';
  return 'Low';
}

export function getProgressTrend(gainPercent: number, riskLevel: string): 'Improving' | 'Stable' | 'Declining' {
  if (gainPercent > 20 && (riskLevel === 'Low' || riskLevel === 'Medium')) return 'Improving';
  if (gainPercent < 0 || riskLevel === 'Critical' || riskLevel === 'High') return 'Declining';
  return 'Stable';
}

export function calculateSkillProfile(attempts: any[]) {
  const skills = {
    Meaning: { total: 0, correct: 0 },
    'Word Recognition': { total: 0, correct: 0 },
    Listening: { total: 0, correct: 0 },
    Context: { total: 0, correct: 0 },
    Spelling: { total: 0, correct: 0 },
  };

  attempts.forEach(attempt => {
    // Legacy placeholder
  });

  return skills;
}

export function calculateClassroomWeakestSkill(itemAnalysis: any[], vocabList: any[]) {
  if (!itemAnalysis || itemAnalysis.length === 0 || !vocabList || vocabList.length === 0) {
    return 'Listening'; // Fallback
  }

  // Map words to skill areas, then calculate average success rate
  const skillStats: Record<string, { totalSuccess: number, count: number }> = {};
  
  itemAnalysis.forEach(item => {
    const word = vocabList.find(v => v.id === item.word_id);
    const skill = word?.skill_area || 'Vocabulary'; // Default
    
    if (!skillStats[skill]) {
      skillStats[skill] = { totalSuccess: 0, count: 0 };
    }
    skillStats[skill].totalSuccess += (item.success_rate || 50);
    skillStats[skill].count += 1;
  });

  let weakest = 'Listening'; // Fallback
  let minAvg = 101;

  for (const [skill, stats] of Object.entries(skillStats)) {
    if (stats.count > 0) {
      const avg = stats.totalSuccess / stats.count;
      if (avg < minAvg) {
        minAvg = avg;
        weakest = skill;
      }
    }
  }

  return weakest;
}

export function calculateStudentSkillRadar(baseAccuracy: number, wrongWordsList: any[]) {
  // Base score for all skills depends on the student's overall accuracy.
  // We'll use 5 common skills for the Radar chart
  const radar = {
    Meaning: Math.max(0, baseAccuracy),
    Listening: Math.max(0, baseAccuracy),
    Context: Math.max(0, baseAccuracy),
    Spelling: Math.max(0, baseAccuracy),
    'Word Recog': Math.max(0, baseAccuracy),
  };

  if (!wrongWordsList || wrongWordsList.length === 0) {
    return radar;
  }

  // Calculate penalties based on what kind of words they get wrong often
  // Since we don't store exact question type success, we map bloom_level/skill_area to penalties
  wrongWordsList.forEach(ww => {
    const w = ww.vocabulary;
    if (!w) return;

    const penalty = Math.min(15, (ww.wrong_count || 1) * 2); // Max 15 points penalty per word

    // Heuristics to estimate skill penalties
    if (w.skill_area === 'Listening') radar.Listening -= penalty;
    if (w.skill_area === 'Spelling' || w.word.length > 7) radar.Spelling -= penalty;
    if (w.bloom_level === 'Understand' || w.bloom_level === 'Apply') radar.Context -= penalty;
    if (w.assessment_type === 'Meaning Match' || w.bloom_level === 'Remember') radar.Meaning -= penalty;
    
    // Word Recognition takes a small hit for any wrong word
    radar['Word Recog'] -= penalty * 0.5;
  });

  // Ensure values stay in 0-100 bounds and maybe add a small randomizer seed to break ties visually
  const seed = wrongWordsList.length;
  for (const key in radar) {
    const k = key as keyof typeof radar;
    // Add minor flavor based on word count to make the shape look organic if they have no wrong words
    const flavor = seed === 0 ? (k.length % 5) : 0; 
    radar[k] = Math.max(20, Math.min(100, radar[k] + flavor));
  }

  return radar;
}
