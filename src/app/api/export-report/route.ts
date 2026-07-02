import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vocab Journey';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Item Analysis');

    // Define columns
    sheet.columns = [
      { header: 'No.', key: 'no', width: 5 },
      { header: 'Vocabulary', key: 'vocab', width: 20 },
      { header: 'Meaning', key: 'meaning', width: 30 },
      { header: 'Attempt Count', key: 'attempts', width: 15 },
      { header: 'Success Rate (%)', key: 'success', width: 15 },
      { header: 'P-Value (Difficulty)', key: 'p_value', width: 20 },
      { header: 'D-Value (Discrimination)', key: 'd_value', width: 25 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Add some styling to header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600

    // Mock data for demonstration. In production, fetch from Supabase `item_analysis` joined with `vocabulary`.
    const mockData = [
      { vocab: 'abandon', meaning: 'ละทิ้ง', attempts: 120, success: 45, p_value: 0.45, d_value: 0.20 },
      { vocab: 'benevolent', meaning: 'เมตตา', attempts: 85, success: 30, p_value: 0.30, d_value: 0.45 },
      { vocab: 'crucial', meaning: 'สำคัญมาก', attempts: 150, success: 80, p_value: 0.80, d_value: 0.15 },
      { vocab: 'dilemma', meaning: 'ภาวะกลืนไม่เข้าคายไม่ออก', attempts: 90, success: 20, p_value: 0.20, d_value: 0.50 }
    ];

    mockData.forEach((row, index) => {
      // Calculate status based on P and D values
      let status = 'Good';
      if (row.p_value < 0.2) status = 'Too Hard';
      if (row.p_value > 0.8) status = 'Too Easy';
      if (row.d_value < 0.2) status = 'Needs Revision';

      sheet.addRow({
        no: index + 1,
        vocab: row.vocab,
        meaning: row.meaning,
        attempts: row.attempts,
        success: row.success,
        p_value: row.p_value,
        d_value: row.d_value,
        status: status
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="VocabJourney_ItemAnalysis.xlsx"'
      }
    });

  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
