'use server';

import { startChristmasAttempt, getNextChristmasQuestion, submitChristmasAnswer, finishChristmasAttempt } from '../../../services/christmasEventService';

export async function actionStartChristmasAttempt(studentId: string) {
  try {
    const attemptId = await startChristmasAttempt(studentId);
    return { success: true, attemptId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actionGetNextChristmasQuestion(studentId: string) {
  try {
    const question = await getNextChristmasQuestion(studentId);
    return { success: true, question };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actionSubmitChristmasAnswer(
  attemptId: string,
  vocabId: string,
  qType: string,
  studentAnswer: string,
  attemptNo: number,
  hearts: number,
  studentId: string
) {
  try {
    const result = await submitChristmasAnswer(attemptId, vocabId, qType, studentAnswer, attemptNo, hearts, studentId);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function actionFinishChristmasAttempt(attemptId: string, studentId: string) {
  try {
    const result = await finishChristmasAttempt(attemptId, studentId);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
