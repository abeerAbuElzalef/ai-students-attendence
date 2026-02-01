const { connectToDatabase } = require('./_lib/db');
const { Teacher, Class, Student, Attendance } = require('./_lib/models');
const { verifyAdmin } = require('./_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authResult = await verifyAdmin(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    await connectToDatabase();
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const resource = url.searchParams.get('resource');
    const id = url.searchParams.get('id');
    const sortBy = url.searchParams.get('sortBy') || 'firstName'; // firstName or lastName
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    // GET /api/admin/dashboard - Get dashboard stats
    if (resource === 'dashboard' && req.method === 'GET') {
      const totalTeachers = await Teacher.countDocuments({ role: { $ne: 'admin' } });
      const totalClasses = await Class.countDocuments();
      const totalStudents = await Student.countDocuments();
      const totalAttendanceRecords = await Attendance.countDocuments();

      const recentTeachers = await Teacher.find({ role: { $ne: 'admin' } })
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(5);

      const recentClasses = await Class.find()
        .populate('teacher', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(5);

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
            as: 'teacherInfo'
          }
        },
        {
          $unwind: '$teacherInfo'
        },
        {
          $match: {
            'teacherInfo.role': { $ne: 'admin' }
          }
        },
        {
          $project: {
            _id: 1,
            classCount: 1,
            teacherFirstName: '$teacherInfo.firstName',
            teacherLastName: '$teacherInfo.lastName',
            teacherEmail: '$teacherInfo.email'
          }
        }
      ]);

      return res.json({
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
    }

    // GET /api/admin/teachers with sorting and pagination
    if (resource === 'teachers' && !id && req.method === 'GET') {
      // Build sort object based on sortBy parameter
      const sortField = sortBy === 'lastName' ? 'lastName' : 'firstName';
      const sortObj = { [sortField]: 1 }; // 1 for ascending (A-Z in Hebrew)

      // Get total count for pagination
      const totalTeachers = await Teacher.countDocuments({ role: { $ne: 'admin' } });
      const totalPages = Math.ceil(totalTeachers / limit);

      // Get teachers with pagination and sorting
      const teachers = await Teacher.find({ role: { $ne: 'admin' } })
        .select('-password')
        .collation({ locale: 'he' }) // Hebrew collation for proper sorting
        .sort(sortObj)
        .skip(skip)
        .limit(limit);

      // Add stats for each teacher
      const teachersWithStats = await Promise.all(teachers.map(async (teacher) => {
        const classCount = await Class.countDocuments({ teacher: teacher._id });
        const studentCount = await Student.countDocuments({ teacher: teacher._id });
        return { ...teacher.toObject(), classCount, studentCount };
      }));

      return res.json({
        teachers: teachersWithStats,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalTeachers,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    }

    // DELETE /api/admin/teachers/:id
    if (resource === 'teachers' && id && req.method === 'DELETE') {
      if (authResult.teacher._id.toString() === id) {
        return res.status(400).json({ error: 'לא ניתן למחוק את החשבון שלך' });
      }
      const teacher = await Teacher.findById(id);
      if (!teacher) {
        return res.status(404).json({ error: 'מורה לא נמצא' });
      }
      const students = await Student.find({ teacher: id });
      const studentIds = students.map(s => s._id);
      await Attendance.deleteMany({ student: { $in: studentIds } });
      await Student.deleteMany({ teacher: id });
      await Class.deleteMany({ teacher: id });
      await Teacher.findByIdAndDelete(id);
      return res.json({ message: 'המורה נמחק בהצלחה' });
    }

    // GET /api/admin/classes with pagination
    if (resource === 'classes' && !id && req.method === 'GET') {
      const totalClasses = await Class.countDocuments();
      const totalPages = Math.ceil(totalClasses / limit);

      const classes = await Class.find()
        .populate('teacher', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const classesWithStats = await Promise.all(classes.map(async (classDoc) => {
        const studentCount = await Student.countDocuments({ class: classDoc._id });
        return { ...classDoc.toObject(), studentCount };
      }));

      return res.json({
        classes: classesWithStats,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalClasses,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    }

    // DELETE /api/admin/classes/:id
    if (resource === 'classes' && id && req.method === 'DELETE') {
      const classDoc = await Class.findById(id);
      if (!classDoc) {
        return res.status(404).json({ error: 'כיתה לא נמצאה' });
      }
      const students = await Student.find({ class: id });
      const studentIds = students.map(s => s._id);
      await Attendance.deleteMany({ student: { $in: studentIds } });
      await Student.deleteMany({ class: id });
      await Class.findByIdAndDelete(id);
      return res.json({ message: 'הכיתה נמחקה בהצלחה' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
