const { connectToDatabase } = require('./_lib/db');
const { Student, Attendance, Class, Holiday } = require('./_lib/models');
const { verifyAuth } = require('./_lib/auth');
const xlsx = require('xlsx');

module.exports = async (req, res) => {
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
    const teacherId = authResult.teacher._id;
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const year = parseInt(url.searchParams.get('year'));
    const month = parseInt(url.searchParams.get('month'));
    const classId = url.searchParams.get('classId');

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    let studentQuery = { teacher: teacherId };
    if (classId) studentQuery.class = classId;
    
    const students = await Student.find(studentQuery).populate('class', 'name').sort({ name: 1 });

    let className = 'all-classes';
    if (classId) {
      const classDoc = await Class.findById(classId);
      if (classDoc) className = classDoc.name;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      student: { $in: students.map(s => s._id) },
      date: { $gte: startDate, $lte: endDate }
    });

    const holidays = await Holiday.find({ date: { $gte: startDate, $lte: endDate } });
    const holidayDates = new Set(holidays.map(h => new Date(h.date).getDate()));

    const daysInMonth = new Date(year, month, 0).getDate();
    
    const headers = ['שם התלמיד', 'כיתה'];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dayOfWeek = date.getDay();
      const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
      headers.push(`${d} (${dayNames[dayOfWeek]})`);
    }
    headers.push('סה"כ נוכחות', 'אחוז נוכחות');

    const data = [headers];

    for (const student of students) {
      const row = [student.name, student.class?.name || ''];
      let presentCount = 0;
      let schoolDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          row.push('שבת');
          continue;
        }
        if (holidayDates.has(d)) {
          row.push('חג');
          continue;
        }

        schoolDays++;
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

    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, `נוכחות ${month}/${year}`);

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `attendance_${className}_${year}_${month}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
