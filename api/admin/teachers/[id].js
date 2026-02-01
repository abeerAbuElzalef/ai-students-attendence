const { connectToDatabase } = require('../../_lib/db');
const { Teacher, Class, Student, Attendance } = require('../../_lib/models');
const { verifyAdmin } = require('../../_lib/auth');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdmin(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    await connectToDatabase();
    const { id } = req.query;

    // Don't allow deleting self
    if (authResult.teacher._id.toString() === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Get all students for this teacher
    const students = await Student.find({ teacher: id });
    const studentIds = students.map(s => s._id);

    // Delete all attendance records for these students
    await Attendance.deleteMany({ student: { $in: studentIds } });

    // Delete all students
    await Student.deleteMany({ teacher: id });

    // Delete all classes
    await Class.deleteMany({ teacher: id });

    // Delete the teacher
    await Teacher.findByIdAndDelete(id);

    res.json({ message: 'Teacher and all related data deleted successfully' });
  } catch (error) {
    console.error('Admin delete teacher error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
