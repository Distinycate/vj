export type VerbData = {
  id: string;
  base_form: string;
  past_simple: string;
  past_participle: string;
  meaning_th: string;
  pronunciation_base?: string;
  pronunciation_past?: string;
  pronunciation_participle?: string;
};

export type QuestionType = 
  | 'v1_to_v2' 
  | 'v1_to_v3' 
  | 'fill_v2' 
  | 'fill_v3' 
  | 'full_table' 
  | 'reverse_v3_to_v1_v2' 
  | 'sentence_past' 
  | 'sentence_perfect' 
  | 'dictation_v2'
  | 'dictation_v3';

export type GeneratedQuestion = {
  verbId: string;
  questionType: QuestionType;
  prompt: string;
  expectedAnswer: string;
  secondaryExpectedAnswer?: string; // For full_table or reverse
  speechText?: string;
};

export function generateVerbQuestion(verb: VerbData, phase: number, masteryLevel: number = 0): GeneratedQuestion {
  // Phase 1 (Rookie): 1-20
  // Phase 2 (Warrior): 21-50
  // Phase 3 (Master): 51-83
  
  let availableTypes: QuestionType[] = [];
  
  if (phase === 1 || masteryLevel < 2) {
    availableTypes = ['v1_to_v2', 'v1_to_v3', 'fill_v2', 'fill_v3'];
  } else if (phase === 2) {
    availableTypes = ['v1_to_v2', 'v1_to_v3', 'fill_v2', 'fill_v3', 'full_table', 'reverse_v3_to_v1_v2', 'sentence_past'];
  } else {
    availableTypes = ['v1_to_v2', 'v1_to_v3', 'fill_v2', 'fill_v3', 'full_table', 'reverse_v3_to_v1_v2', 'sentence_past', 'sentence_perfect', 'dictation_v2', 'dictation_v3'];
  }

  // Randomize type
  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

  switch (type) {
    case 'v1_to_v2':
      return { verbId: verb.id, questionType: type, prompt: `เขียน Past Simple ของคำว่า: ${verb.base_form}`, expectedAnswer: verb.past_simple };
    case 'v1_to_v3':
      return { verbId: verb.id, questionType: type, prompt: `เขียน Past Participle ของคำว่า: ${verb.base_form}`, expectedAnswer: verb.past_participle };
    case 'fill_v2':
      return { verbId: verb.id, questionType: type, prompt: `เติมคำที่หายไป\n${verb.base_form} / _____ / ${verb.past_participle}`, expectedAnswer: verb.past_simple };
    case 'fill_v3':
      return { verbId: verb.id, questionType: type, prompt: `เติมคำที่หายไป\n${verb.base_form} / ${verb.past_simple} / _____`, expectedAnswer: verb.past_participle };
    case 'full_table':
      return { 
        verbId: verb.id, 
        questionType: type, 
        prompt: `เติมกริยา 3 ช่องให้ครบ\nV1: ${verb.base_form}\nV2: _____\nV3: _____`, 
        expectedAnswer: verb.past_simple, 
        secondaryExpectedAnswer: verb.past_participle 
      };
    case 'reverse_v3_to_v1_v2':
      return { 
        verbId: verb.id, 
        questionType: type, 
        prompt: `ถ้า Past Participle คือ "${verb.past_participle}"\nV1 และ V2 คืออะไร`, 
        expectedAnswer: verb.base_form,
        secondaryExpectedAnswer: verb.past_simple
      };
    case 'sentence_past':
      // Simplified sentence generation, can be expanded
      return { verbId: verb.id, questionType: type, prompt: `Yesterday, I _____ (${verb.meaning_th}).`, expectedAnswer: verb.past_simple };
    case 'sentence_perfect':
      return { verbId: verb.id, questionType: type, prompt: `I have _____ (${verb.meaning_th}).`, expectedAnswer: verb.past_participle };
    case 'dictation_v2':
      return { 
        verbId: verb.id, 
        questionType: type, 
        prompt: 'ฟังเสียงแล้วพิมพ์คำกริยาช่อง 2',
        expectedAnswer: verb.past_simple,
        speechText: verb.past_simple,
      };
    case 'dictation_v3':
      return {
        verbId: verb.id,
        questionType: type,
        prompt: 'ฟังเสียงแล้วพิมพ์คำกริยาช่อง 3',
        expectedAnswer: verb.past_participle,
        speechText: verb.past_participle,
      };
    default:
      return { verbId: verb.id, questionType: 'v1_to_v2', prompt: `เขียน Past Simple ของคำว่า: ${verb.base_form}`, expectedAnswer: verb.past_simple };
  }
}
