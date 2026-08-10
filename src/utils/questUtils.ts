export function getMockQuests(studentId: string) {
  if (typeof window === 'undefined') return [];
  const today = new Date().toISOString().split('T')[0];
  const mockKey = `mock_quests_${studentId}_${today}`;
  const savedMock = localStorage.getItem(mockKey);
  if (savedMock) {
    try {
      return JSON.parse(savedMock);
    } catch(e) {}
  }
  return [
    { id: '1', title: 'เข้าเรียนและเล่นเกมคำศัพท์ 3 ด่าน', target_value: 3, reward_coins: 100, reward_tickets: 0, progress: 0, claimed: false },
    { id: '2', title: 'ทำแบบทดสอบได้คะแนนเต็ม (Perfect Score) 1 ครั้ง', target_value: 1, reward_coins: 50, reward_tickets: 1, progress: 0, claimed: false },
    { id: '3', title: 'ทบทวนคำศัพท์เก่า (Spaced Repetition) 10 คำ', target_value: 10, reward_coins: 150, reward_tickets: 0, progress: 0, claimed: false }
  ];
}

export function incrementMockQuestProgress(studentId: string, questId: string, amount: number = 1) {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().split('T')[0];
  const mockKey = `mock_quests_${studentId}_${today}`;
  const savedMock = localStorage.getItem(mockKey);
  let quests = [];
  if (savedMock) {
    try {
      quests = JSON.parse(savedMock);
    } catch(e) {}
  } else {
    quests = getMockQuests(studentId);
  }

  const updatedQuests = quests.map((q: any) => {
    if (q.id === questId) {
      return { ...q, progress: Math.min(q.target_value, q.progress + amount) };
    }
    return q;
  });

  localStorage.setItem(mockKey, JSON.stringify(updatedQuests));
}
