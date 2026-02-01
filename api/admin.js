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
    const resource = url.searchParams.get('resource'); // teachers or classes
    const id = url.searchParams.get('id');

    // GET /api/admin/teachers
    if (resource === 'teachers' && !id && req.method === 'GET') {
      const teachers = await Teacher.find().select('-password').sort({ createdAt: -1 });
      const teachersWithStats = await Promise.all(teachers.map(async (teacher) => {
        const classCount = await Class.countDocuments({ teacher: teacher._id });
        const studentCount = await Student.countDocuments({ teacher: teacher._id });
        return { ...teacher.toObject(), classCount, studentCount };
      }));
      return res.json(teachersWithStats);
    }

    // DELETE /api/admin/teachers/:id
    if (resource === 'teachers' && id && req.method === 'DELETE') {
      if (authResult.teacher._id.toString() === id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      const teacher = await Teacher.findById(id);
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      const students = await Student.find({ teacher: id });
      const studentIds = students.map(s => s._id);
      await Attendance.deleteMany({ student: { $in: studentIds } });
      await Student.deleteMany({ teacher: id });
      await Class.deleteMany({ teacher: id });
      await Teacher.findByIdAndDelete(id);
      return res.json({ message: 'Teacher deleted successfully' });
    }

    // GET /api/admin/classes
    if (resource === 'classes' && !id && req.method === 'GET') {
      const classes = await Class.find().populate('teacher', 'name email').sort({ createdAt: -1 });
      const classesWithStats = await Promise.all(classes.map(async (classDoc) => {
        const studentCount = await Student.countDocuments({ class: classDoc._id });
        return { ...classDoc.toObject(), studentCount };
      }));
      return res.json(classesWithStats);
    }

    // DELETE /api/admin/classes/:id
    if (resource === 'classes' && id && req.method === 'DELETE') {
      const classDoc = await Class.findById(id);
      if (!classDoc) {
        return res.status(404).json({ error: 'Class not found' });
      }
      const students = await Student.find({ class: id });
      const studentIds = students.map(s => s._id);
      await Attendance.deleteMany({ student: { $in: studentIds } });
      await Student.deleteMany({ class: id });
      await Class.findByIdAndDelete(id);
      return res.json({ message: 'Class deleted successfully' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
