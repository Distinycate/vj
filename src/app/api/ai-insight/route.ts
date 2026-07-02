import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { avgAccuracy, weakestSkill, atRiskCount } = body;

    // Check if API key is provided
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy_key') {
      return NextResponse.json({ 
        insight: `[ระบบจำลอง] ความแม่นยำเฉลี่ยของห้องอยู่ที่ ${Math.round(avgAccuracy)}% และพบกลุ่มเสี่ยงจำนวน ${atRiskCount} คน หมวดคำศัพท์ที่อ่อนที่สุดคือ "${weakestSkill}" แนะนำให้ครูจัดกิจกรรมทบทวนหมวดนี้เป็นพิเศษ` 
      });
    }

    const prompt = `Act as an expert educational data analyst. I will give you class performance data.
    Class Data: 
    - Average Accuracy: ${avgAccuracy}%
    - Weakest Category: ${weakestSkill}
    - Students at Risk: ${atRiskCount}
    
    Please provide a short, 2-sentence actionable summary in Thai language. 
    The output should highlight the main weak point and suggest a brief instructional next step for the teacher.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });

    const insight = response.choices[0].message?.content || 'ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้';

    return NextResponse.json({ insight });
  } catch (error) {
    console.error('AI Insight Error:', error);
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 });
  }
}
