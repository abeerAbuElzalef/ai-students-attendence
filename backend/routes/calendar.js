const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Holiday = require('../models/Holiday');
const { protect } = require('../middleware/auth');
const { isSchoolDay, getHolidaysForYear } = require('../holidays');

// All routes require authentication
router.use(protect);

// @route   GET /api/calendar/:year/:month
// @desc    Get calendar data for a month
// @access  Private
router.get('/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const { classId } = req.query;
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    
    // Get student count
    const studentQuery = { teacher: req.teacher._id, active: true };
    if (classId) {
      studentQuery.class = classId;
    }
    const totalStudents = await Student.countDocuments(studentQuery);
    
    // Get attendance for the month
    const attendanceQuery = {
      teacher: req.teacher._id,
      date: { $gte: startDate, $lte: endDate }
    };
    if (classId) {
      attendanceQuery.class = classId;
    }
    const attendance = await Attendance.find(attendanceQuery);
    
    // Get holidays
    let holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    });
    
    // If no holidays cached, calculate and save them
    if (holidays.length === 0) {
      const yearHolidays = getHolidaysForYear(year);
      if (yearHolidays.length > 0) {
        await Holiday.insertMany(yearHolidays.map(h => ({
          date: h.date,
          name: h.name,
          hebrewName: h.hebrewName,
          year: h.year,
          isSchoolHoliday: h.isSchoolHoliday
        })), { ordered: false }).catch(() => {});
        
        holidays = await Holiday.find({
          date: { $gte: startDate, $lte: endDate }
        });
      }
    }
    
    // Build holiday map
    const holidayMap = {};
    for (const h of holidays) {
      holidayMap[h.date] = h;
    }
    
    // Build calendar days
    const calendarDays = [];
    
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const schoolDayInfo = isSchoolDay(dateStr);
      const dayAttendance = attendance.filter(a => a.date === dateStr);
      const dayHoliday = holidayMap[dateStr];
      
      // Count attendance
      const presentCount = dayAttendance.filter(a => a.status === 'present').length;
      const absentCount = dayAttendance.filter(a => a.status === 'absent').length;
      const lateCount = dayAttendance.filter(a => a.status === 'late').length;
      const excusedCount = dayAttendance.filter(a => a.status === 'excused').length;
      
      calendarDays.push({
        date: dateStr,
        day,
        dayOfWeek: new Date(dateStr).getDay(),
        isSchoolDay: schoolDayInfo.isSchoolDay,
        isHalfDay: schoolDayInfo.isHalfDay || false,
        reason: schoolDayInfo.reason,
        holiday: dayHoliday,
        attendance: {
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          excused: excusedCount,
          total: totalStudents,
          recorded: dayAttendance.length
        }
      });
    }
    
    res.json({
      year,
      month,
      totalStudents,
      days: calendarDays
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
