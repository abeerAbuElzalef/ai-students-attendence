/**
 * Student Attendance Tracking System - Backend Server
 * Supports Hebrew names, Israeli holidays, and Excel export
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const { initializeDatabase, studentOps, attendanceOps, holidayOps } = require('./database');
const holidays = require('./holidays');
const { generateMonthlyReport, generateStudentReport } = require('./excelExport');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Pre-populate holidays for current and next year
function initializeHolidays() {
  const currentYear = new Date().getFullYear();
  
  for (let year = currentYear; year <= currentYear + 1; year++) {
    const yearHolidays = holidays.getHolidaysForYear(year);
    holidayOps.bulkSave(yearHolidays);
    console.log(`Loaded ${yearHolidays.length} holidays for ${year}`);
  }
}

try {
  initializeHolidays();
} catch (err) {
  console.log('Holiday initialization skipped:', err.message);
}

// ============ STUDENT ROUTES ============

// Get all students
app.get('/api/students', (req, res) => {
  try {
    const students = studentOps.getAll();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single student
app.get('/api/students/:id', (req, res) => {
  try {
    const student = studentOps.getById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create student
app.post('/api/students', (req, res) => {
  try {
    const { name, className } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const student = studentOps.create(name, className);
    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk create students
app.post('/api/students/bulk', (req, res) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'Students array is required' });
    }
    const created = studentOps.bulkCreate(students);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update student
app.put('/api/students/:id', (req, res) => {
  try {
    const { name, className } = req.body;
    const student = studentOps.update(req.params.id, name, className);
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
  try {
    studentOps.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ATTENDANCE ROUTES ============

// Get attendance for a specific date
app.get('/api/attendance/date/:date', (req, res) => {
  try {
    const attendance = attendanceOps.getByDate(req.params.date);
    const students = studentOps.getAll();
    
    // Include school day info
    const schoolDayInfo = holidays.isSchoolDay(req.params.date);
    
    // Create a map for quick lookup
    const attendanceMap = {};
    for (const record of attendance) {
      attendanceMap[record.student_id] = record;
    }
    
    // Combine students with their attendance
    const result = students.map(student => ({
      ...student,
      attendance: attendanceMap[student.id] || null
    }));
    
    res.json({
      date: req.params.date,
      schoolDayInfo,
      students: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance for date range
app.get('/api/attendance/range', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const attendance = attendanceOps.getByDateRange(startDate, endDate);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get monthly summary
app.get('/api/attendance/monthly/:year/:month', (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    
    const attendance = attendanceOps.getByDateRange(startDate, endDate);
    const stats = attendanceOps.getStats(startDate, endDate);
    const monthHolidays = holidayOps.getByDateRange(startDate, endDate);
    const nonSchoolDays = holidays.getNonSchoolDays(startDate, endDate);
    
    res.json({
      year: parseInt(year),
      month: parseInt(month),
      attendance,
      stats,
      holidays: monthHolidays,
      nonSchoolDays
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark attendance for a student
app.post('/api/attendance', (req, res) => {
  try {
    const { studentId, date, status, notes } = req.body;
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'studentId, date, and status are required' });
    }
    
    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: present, absent, late, or excused' });
    }
    
    const result = attendanceOps.markAttendance(studentId, date, status, notes);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk mark attendance
app.post('/api/attendance/bulk', (req, res) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Records array is required' });
    }
    
    attendanceOps.bulkMarkAttendance(records);
    res.json({ success: true, count: records.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance statistics
app.get('/api/attendance/stats', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const stats = attendanceOps.getStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ HOLIDAY ROUTES ============

// Get holidays for a year
app.get('/api/holidays/:year', (req, res) => {
  try {
    let yearHolidays = holidayOps.getByYear(parseInt(req.params.year));
    
    // If not in cache, calculate and save
    if (yearHolidays.length === 0) {
      yearHolidays = holidays.getHolidaysForYear(parseInt(req.params.year));
      holidayOps.bulkSave(yearHolidays);
    }
    
    res.json(yearHolidays);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if date is a school day
app.get('/api/holidays/check/:date', (req, res) => {
  try {
    const result = holidays.isSchoolDay(req.params.date);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get non-school days for a range
app.get('/api/holidays/non-school-days', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const nonSchoolDays = holidays.getNonSchoolDays(startDate, endDate);
    res.json(nonSchoolDays);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EXPORT ROUTES ============

// Export monthly report to Excel
app.get('/api/export/monthly/:year/:month', (req, res) => {
  try {
    const { year, month } = req.params;
    const { buffer, filename } = generateMonthlyReport(parseInt(year), parseInt(month));
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export student report to Excel
app.get('/api/export/student/:id/:year', (req, res) => {
  try {
    const { id, year } = req.params;
    const { buffer, filename } = generateStudentReport(parseInt(id), parseInt(year));
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CALENDAR DATA ROUTE ============

// Get calendar data for a month (combines attendance, holidays, students)
app.get('/api/calendar/:year/:month', (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    
    const students = studentOps.getAll();
    const attendance = attendanceOps.getByDateRange(startDate, endDate);
    const monthHolidays = holidayOps.getByDateRange(startDate, endDate);
    
    // Build calendar data
    const calendarDays = [];
    
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const schoolDayInfo = holidays.isSchoolDay(dateStr);
      const dayAttendance = attendance.filter(a => a.date === dateStr);
      const dayHoliday = monthHolidays.find(h => h.date === dateStr);
      
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
          total: students.length,
          recorded: dayAttendance.length
        }
      });
    }
    
    res.json({
      year,
      month,
      totalStudents: students.length,
      days: calendarDays
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     מערכת מעקב נוכחות תלמידים - Student Attendance        ║
║              Server running on port ${PORT}                   ║
╚════════════════════════════════════════════════════════════╝
  `);
  console.log(`API available at http://localhost:${PORT}/api`);
});
