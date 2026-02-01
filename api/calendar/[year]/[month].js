const { connectToDatabase } = require('../../_lib/db');
const { Attendance, Student, Holiday } = require('../../_lib/models');
const { verifyAuth } = require('../../_lib/auth');
const { HebrewCalendar, HDate, Location } = require('@hebcal/core');

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
    const { year, month } = req.query;
    const { classId } = req.query;
    const teacherId = authResult.teacher._id;

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Get first and last day of month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Get students for this teacher
    let studentQuery = { teacher: teacherId };
    if (classId) {
      studentQuery.class = classId;
    }
    const students = await Student.find(studentQuery);
    const studentIds = students.map(s => s._id);

    // Get attendance records for the month
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate }
    });

    // Get holidays for the month (from cache or generate)
    let holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    });

    // If no cached holidays, generate them
    if (holidays.length === 0) {
      const events = HebrewCalendar.calendar({
        year: yearNum,
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
        return evDate.getMonth() === monthNum - 1;
      });

      for (const ev of monthEvents) {
        const evDate = ev.getDate().greg();
        evDate.setHours(12, 0, 0, 0);
        
        try {
          await Holiday.findOneAndUpdate(
            { date: evDate },
            {
              date: evDate,
              name: ev.render('en'),
              hebrewName: ev.render('he')
            },
            { upsert: true }
          );
        } catch (e) {
          // Ignore duplicate key errors
        }
      }

      holidays = await Holiday.find({
        date: { $gte: startDate, $lte: endDate }
      });
    }

    // Build calendar data
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const calendarDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearNum, monthNum - 1, day, 12, 0, 0);
      const dayOfWeek = date.getDay();
      
      // Get attendance for this day
      const dayAttendance = attendanceRecords.filter(a => {
        const aDate = new Date(a.date);
        return aDate.getDate() === day;
      });

      const presentCount = dayAttendance.filter(a => a.present).length;
      const totalStudents = students.length;

      // Check for holiday
      const holiday = holidays.find(h => {
        const hDate = new Date(h.date);
        return hDate.getDate() === day;
      });

      calendarDays.push({
        date: date.toISOString().split('T')[0],
        day,
        dayOfWeek,
        isWeekend: dayOfWeek === 5 || dayOfWeek === 6, // Friday or Saturday
        holiday: holiday ? { name: holiday.name, hebrewName: holiday.hebrewName } : null,
        attendance: {
          present: presentCount,
          total: totalStudents,
          percentage: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0
        }
      });
    }

    res.json({
      year: yearNum,
      month: monthNum,
      days: calendarDays
    });
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
