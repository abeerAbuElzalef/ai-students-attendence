const { connectToDatabase } = require('./_lib/db');
const { Attendance, Student, Holiday } = require('./_lib/models');
const { verifyAuth } = require('./_lib/auth');
const { HebrewCalendar, Location } = require('@hebcal/core');

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

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    let studentQuery = { teacher: teacherId };
    if (classId) studentQuery.class = classId;
    
    const students = await Student.find(studentQuery);
    const studentIds = students.map(s => s._id);

    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate }
    });

    // Get or generate holidays
    let holidays = await Holiday.find({ date: { $gte: startDate, $lte: endDate } });

    if (holidays.length === 0) {
      try {
        const events = HebrewCalendar.calendar({
          year: year,
          isHebrewYear: false,
          location: Location.lookup('Jerusalem'),
          il: true,
          candlelighting: false,
          sedrot: false,
          omer: false,
          shabbatMevarchim: false,
          molad: false
        });

        const monthEvents = events.filter(ev => {
          const evDate = ev.getDate().greg();
          return evDate.getMonth() === month - 1;
        });

        for (const ev of monthEvents) {
          const evDate = ev.getDate().greg();
          evDate.setHours(12, 0, 0, 0);
          try {
            await Holiday.findOneAndUpdate(
              { date: evDate },
              { date: evDate, name: ev.render('en'), hebrewName: ev.render('he') },
              { upsert: true }
            );
          } catch (e) { /* ignore duplicates */ }
        }

        holidays = await Holiday.find({ date: { $gte: startDate, $lte: endDate } });
      } catch (e) {
        console.error('Holiday generation error:', e);
      }
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const calendarDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day, 12, 0, 0);
      const dayOfWeek = date.getDay();
      
      const dayAttendance = attendanceRecords.filter(a => new Date(a.date).getDate() === day);
      const presentCount = dayAttendance.filter(a => a.present).length;
      const totalStudents = students.length;

      const holiday = holidays.find(h => new Date(h.date).getDate() === day);

      calendarDays.push({
        date: date.toISOString().split('T')[0],
        day,
        dayOfWeek,
        isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
        holiday: holiday ? { name: holiday.name, hebrewName: holiday.hebrewName } : null,
        attendance: {
          present: presentCount,
          total: totalStudents,
          percentage: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0
        }
      });
    }

    res.json({ year, month, days: calendarDays });
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
