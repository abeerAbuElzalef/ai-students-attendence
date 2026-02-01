const { connectToDatabase } = require('../_lib/db');
const { Student, Attendance, Class, Holiday } = require('../_lib/models');
const { verifyAuth } = require('../_lib/auth');
const xlsx = require('xlsx');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAuth(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    await connectToDatabase();
    const { year, month, classId } = req.query;
    const teacherId = authResult.teacher._id;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Get students
    let studentQuery = { teacher: teacherId };
    if (classId) {
      studentQuery.class = classId;
    }
    const students = await Student.find(studentQuery).populate('class', 'name').sort({ name: 1 });

    // Get class name for filename
    let className = 'all-classes';
    if (classId) {
      const classDoc = await Class.findById(classId);
      if (classDoc) className = classDoc.name;
    }

    // Get attendance for the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      student: { $in: students.map(s => s._id) },
      date: { $gte: startDate, $lte: endDate }
    });

    // Get holidays
    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    });

    const holidayDates = new Set(holidays.map(h => h.date.getDate()));

    // Build Excel data
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    
    // Header row
    const headers = ['שם התלמיד', 'כיתה'];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(yearNum, monthNum - 1, d);
      const dayOfWeek = date.getDay();
      const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
      headers.push(`${d} (${dayNames[dayOfWeek]})`);
    }
    headers.push('סה"כ נוכחות', 'אחוז נוכחות');

    // Data rows
    const data = [headers];

    for (const student of students) {
      const row = [student.name, student.class?.name || ''];
      let presentCount = 0;
      let schoolDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(yearNum, monthNum - 1, d);
        const dayOfWeek = date.getDay();
        
        // Skip weekends (Friday=5, Saturday=6) and holidays
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          row.push('שבת');
          continue;
        }
        if (holidayDates.has(d)) {
          row.push('חג');
          continue;
        }

        schoolDays++;

        // Find attendance record
        const record = attendanceRecords.find(a => 
          a.student.toString() === student._id.toString() &&
          new Date(a.date).getDate() === d
        );

        if (record && record.present) {
          row.push('✓');
          presentCount++;
        } else {
          row.push('✗');
        }
      }

      row.push(presentCount);
      row.push(schoolDays > 0 ? `${Math.round((presentCount / schoolDays) * 100)}%` : 'N/A');
      data.push(row);
    }

    // Create workbook
    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, `נוכחות ${monthNum}/${yearNum}`);

    // Generate buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `attendance_${className}_${yearNum}_${monthNum}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Server error during export' });
  }
};
