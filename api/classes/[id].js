const { connectToDatabase } = require('../_lib/db');
const { Class, Student, Attendance } = require('../_lib/models');
const { verifyAuth } = require('../_lib/auth');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authResult = await verifyAuth(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    await connectToDatabase();
    const { id } = req.query;
    const teacherId = authResult.teacher._id;

    // Verify class belongs to teacher
    const classDoc = await Class.findOne({ _id: id, teacher: teacherId });
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.method === 'GET') {
      return res.json(classDoc);
    }

    if (req.method === 'PUT') {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Class name is required' });
      }
      classDoc.name = name;
      await classDoc.save();
      return res.json(classDoc);
    }

    if (req.method === 'DELETE') {
      // Get all students in this class
      const students = await Student.find({ class: id });
      const studentIds = students.map(s => s._id);

      // Delete attendance records for these students
      await Attendance.deleteMany({ student: { $in: studentIds } });

      // Delete all students in this class
      await Student.deleteMany({ class: id });

      // Delete the class
      await Class.findByIdAndDelete(id);

      return res.json({ message: 'Class and related data deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Class error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
