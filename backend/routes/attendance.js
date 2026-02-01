const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Holiday = require('../models/Holiday');
const { protect } = require('../middleware/auth');
const { isSchoolDay } = require('../holidays');

// All routes require authentication
router.use(protect);

// @route   GET /api/attendance/date/:date
// @desc    Get attendance for a specific date
// @access  Private
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { classId } = req.query;
    
    const query = { teacher: req.teacher._id, active: true };
    if (classId) {
      query.class = classId;
    }
    
    const students = await Student.find(query)
      .populate('class', 'name')
      .sort({ name: 1 });
    
    const attendance = await Attendance.find({
      teacher: req.teacher._id,
      date,
      ...(classId && { class: classId })
    });
    
    // Create attendance map
    const attendanceMap = {};
    for (const record of attendance) {
      attendanceMap[record.student.toString()] = record;
    }
    
    // Combine students with attendance
    const result = students.map(student => ({
      ...student.toObject(),
      attendance: attendanceMap[student._id.toString()] || null
    }));
    
    // Get school day info
    const schoolDayInfo = isSchoolDay(date);
    
    res.json({
      date,
      schoolDayInfo,
      students: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/attendance/range
// @desc    Get attendance for date range
// @access  Private
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate, classId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'נדרשים תאריך התחלה וסיום' });
    }
    
    const query = {
      teacher: req.teacher._id,
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (classId) {
      query.class = classId;
    }
    
    const attendance = await Attendance.find(query)
      .populate('student', 'name')
      .populate('class', 'name')
      .sort({ date: 1 });
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/attendance/monthly/:year/:month
// @desc    Get monthly attendance summary
// @access  Private
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const { classId } = req.query;
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    
    const query = {
      teacher: req.teacher._id,
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (classId) {
      query.class = classId;
    }
    
    const attendance = await Attendance.find(query)
      .populate('student', 'name')
      .populate('class', 'name');
    
    // Get holidays
    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate stats
    const stats = await Attendance.aggregate([
      {
        $match: {
          teacher: req.teacher._id,
          date: { $gte: startDate, $lte: endDate },
          ...(classId && { class: classId })
        }
      },
      {
        $group: {
          _id: '$student',
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);
    
    // Populate student names
    const populatedStats = await Student.populate(stats, { path: '_id', select: 'name class' });
    
    res.json({
      year: parseInt(year),
      month: parseInt(month),
      attendance,
      stats: populatedStats.map(s => ({
        student_id: s._id._id,
        student_name: s._id.name,
        present_count: s.present,
        absent_count: s.absent,
        late_count: s.late,
        excused_count: s.excused,
        total_records: s.total
      })),
      holidays
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/attendance
// @desc    Mark attendance for a student
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { studentId, date, status, notes } = req.body;
    
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'נדרשים תלמיד, תאריך וסטטוס' });
    }
    
    // Verify student belongs to teacher
    const student = await Student.findOne({ _id: studentId, teacher: req.teacher._id });
    if (!student) {
      return res.status(404).json({ error: 'התלמיד לא נמצא' });
    }
    
    // Upsert attendance
    const attendance = await Attendance.findOneAndUpdate(
      { student: studentId, date },
      {
        student: studentId,
        class: student.class,
        teacher: req.teacher._id,
        date,
        status,
        notes
      },
      { upsert: true, new: true, runValidators: true }
    );
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/attendance/bulk
// @desc    Bulk mark attendance
// @access  Private
router.post('/bulk', async (req, res) => {
  try {
    const { records } = req.body;
    
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'נדרשת רשימת רשומות' });
    }
    
    const operations = records.map(record => ({
      updateOne: {
        filter: { student: record.studentId, date: record.date },
        update: {
          $set: {
            student: record.studentId,
            class: record.classId,
            teacher: req.teacher._id,
            date: record.date,
            status: record.status,
            notes: record.notes || ''
          }
        },
        upsert: true
      }
    }));
    
    await Attendance.bulkWrite(operations);
    
    res.json({ success: true, count: records.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/attendance/stats
// @desc    Get attendance statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate, classId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'נדרשים תאריך התחלה וסיום' });
    }
    
    const matchStage = {
      teacher: req.teacher._id,
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (classId) {
      matchStage.class = classId;
    }
    
    const stats = await Attendance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$student',
          present_count: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent_count: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late_count: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excused_count: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } },
          total_records: { $sum: 1 }
        }
      }
    ]);
    
    // Populate student info
    const populatedStats = await Student.populate(stats, { path: '_id', select: 'name class' });
    await Class.populate(populatedStats, { path: '_id.class', select: 'name' });
    
    const result = populatedStats.map(s => ({
      student_id: s._id._id,
      student_name: s._id.name,
      class_name: s._id.class?.name,
      present_count: s.present_count,
      absent_count: s.absent_count,
      late_count: s.late_count,
      excused_count: s.excused_count,
      total_records: s.total_records
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
