export function generateStudentInsight(params: {
  gainPercent: number;
  accuracy: number;
  weakestSkill: string;
  reviewCount: number;
  inactiveDays: number;
}): string {
  if (params.inactiveDays > 7) {
    return `นักเรียนขาดการทำกิจกรรมต่อเนื่องเกิน 7 วัน ควรติดตามและกระตุ้นการเข้าเรียนด่วน`;
  }
  
  if (params.gainPercent > 20 && params.accuracy > 70) {
    let msg = `นักเรียนมีพัฒนาการดีมาก (+${params.gainPercent}%) `;
    if (params.weakestSkill) {
      msg += `แต่ยังสามารถพัฒนาด้าน ${params.weakestSkill} เพิ่มเติมได้ผ่านกิจกรรมซ่อมเสริม`;
    }
    return msg;
  }

  if (params.gainPercent < 0 || params.accuracy < 50) {
    return `นักเรียนอยู่ในเกณฑ์ต้องเฝ้าระวัง (Accuracy ${params.accuracy}%) มักมีปัญหาด้าน ${params.weakestSkill} แนะนำให้ฝึกทบทวนอย่างน้อยวันละ 10 นาที`;
  }

  return `นักเรียนมีพัฒนาการอยู่ในเกณฑ์ปกติ ควรให้ทำแบบฝึกหัดเสริมด้าน ${params.weakestSkill} เพื่อเพิ่มความแม่นยำ`;
}

export function generateClassroomInsight(params: {
  avgGain: number;
  lowAccuracyCount: number;
  weakestSkill: string;
  classroomName: string;
}): string {
  if (params.avgGain > 20) {
    let msg = `ห้อง ${params.classroomName} มีพัฒนาการเฉลี่ยสูง (+${Math.round(params.avgGain)}%) `;
    if (params.lowAccuracyCount > 0) {
      msg += `แต่ยังมีนักเรียนกลุ่มเสี่ยง ${params.lowAccuracyCount} คน ที่อ่อนทักษะ ${params.weakestSkill}`;
    }
    return msg;
  }
  
  return `ห้อง ${params.classroomName} มีพัฒนาการเฉลี่ย ${Math.round(params.avgGain)}% จุดที่ควรเน้นสอนเสริมในภาพรวมคือทักษะด้าน ${params.weakestSkill}`;
}

export function generateSchoolInsight(params: {
  avgGain: number;
  topGrade: string;
  weakGrade: string;
  totalAtRisk: number;
}): string {
  return `ภาพรวมโรงเรียนมี Learning Gain เฉลี่ย +${Math.round(params.avgGain)}% ระดับ ${params.topGrade} มีพัฒนาการสูงสุด ในขณะที่ระดับ ${params.weakGrade} ยังต้องปรับปรุง มีนักเรียนเสี่ยงรวม ${params.totalAtRisk} คน`;
}

export function generateItemInsight(word: string, errorRate: number, grade: string): string {
  return `คำว่า "${word}" มีอัตราผิดสูงถึง ${Math.round(errorRate)}% ในกลุ่ม ${grade} แนะนำให้ครูผู้สอนเน้นทบทวนความหมายและการออกเสียงซ้ำในคาบเรียน`;
}
