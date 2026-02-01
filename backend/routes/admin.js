const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');

// Admin middleware - check if user is admin
const adminOnly = async (req, res, next) => {
  if (!req.teacher.isAdmin) {
    return res.status(403).json({ error: 'גישה למנהלים בלבד' });
  }
  next();
};

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Admin only
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalTeachers,
      totalClasses,
      totalStudents,
      totalAttendanceRecords,
      recentTeachers,
      recentClasses
    ] = await Promise.all([
      Teacher.countDocuments({ isAdmin: false }),
      Class.countDocuments(),
      Student.countDocuments({ active: true }),
      Attendance.countDocuments(),
      Teacher.find({ isAdmin: false })
        .select('name email lastLogin createdAt')
        .sort({ createdAt: -1 })
        .limit(10),
      Class.find()
        .populate('teacher', 'name email')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    // Get classes per teacher stats
    const classesPerTeacher = await Class.aggregate([
      {
        $group: {
          _id: '$teacher',
          classCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      {
        $unwind: '$teacher'
      },
      {
        $project: {
          teacherName: '$teacher.name',
          teacherEmail: '$teacher.email',
          classCount: 1
        }
      },
      {
        $sort: { classCount: -1 }
      }
    ]);

    res.json({
      stats: {
        totalTeachers,
        totalClasses,
        totalStudents,
        totalAttendanceRecords
      },
      recentTeachers,
      recentClasses,
      classesPerTeacher
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/admin/teachers
// @desc    Get all teachers
// @access  Admin only
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find({ isAdmin: false })
      .select('-password')
      .sort({ createdAt: -1 });

    // Get class count for each teacher
    const teachersWithStats = await Promise.all(
      teachers.map(async (teacher) => {
        const classCount = await Class.countDocuments({ teacher: teacher._id });
        const studentCount = await Student.countDocuments({ teacher: teacher._id, active: true });
        return {
          ...teacher.toObject(),
          classCount,
          studentCount
        };
      })
    );

    res.json(teachersWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/admin/teachers/:id
// @desc    Delete a teacher and all their data
// @access  Admin only
router.delete('/teachers/:id', async (req, res) => {
  try {
    const teacherId = req.params.id;

    // Check teacher exists and is not admin
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'המורה לא נמצא' });
    }
    if (teacher.isAdmin) {
      return res.status(400).json({ error: 'לא ניתן למחוק משתמש מנהל' });
    }

    // Delete all related data
    await Attendance.deleteMany({ teacher: teacherId });
    await Student.deleteMany({ teacher: teacherId });
    await Class.deleteMany({ teacher: teacherId });
    await Teacher.findByIdAndDelete(teacherId);

    res.json({ 
      message: 'המורה וכל הנתונים שלו נמחקו בהצלחה',
      deletedTeacher: teacher.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/admin/classes
// @desc    Get all classes from all teachers
// @access  Admin only
router.get('/classes', async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 });

    // Get student count for each class
    const classesWithStats = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({ class: cls._id, active: true });
        return {
          ...cls.toObject(),
          studentCount
        };
      })
    );

    res.json(classesWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/admin/classes/:id
// @desc    Delete a class and all related data
// @access  Admin only
router.delete('/classes/:id', async (req, res) => {
  try {
    const classId = req.params.id;

    const cls = await Class.findById(classId);
    if (!cls) {
      return res.status(404).json({ error: 'הכיתה לא נמצאה' });
    }

    // Get student IDs in this class
    const students = await Student.find({ class: classId });
    const studentIds = students.map(s => s._id);

    // Delete all related data
    await Attendance.deleteMany({ class: classId });
    await Student.deleteMany({ class: classId });
    await Class.findByIdAndDelete(classId);

    res.json({ 
      message: 'הכיתה וכל הנתונים שלה נמחקו בהצלחה',
      deletedClass: cls.name,
      deletedStudents: students.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/admin/activity
// @desc    Get recent activity/logins
// @access  Admin only
router.get('/activity', async (req, res) => {
  try {
    const recentLogins = await Teacher.find({ 
      lastLogin: { $exists: true, $ne: null },
      isAdmin: false 
    })
      .select('name email lastLogin')
      .sort({ lastLogin: -1 })
      .limit(20);

    res.json(recentLogins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
