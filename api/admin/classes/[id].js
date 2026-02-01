const { connectToDatabase } = require('../../_lib/db');
const { Class, Student, Attendance } = require('../../_lib/models');
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

    const classDoc = await Class.findById(id);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get all students in this class
    const students = await Student.find({ class: id });
    const studentIds = students.map(s => s._id);

    // Delete all attendance records for these students
    await Attendance.deleteMany({ student: { $in: studentIds } });

    // Delete all students in this class
    await Student.deleteMany({ class: id });

    // Delete the class
    await Class.findByIdAndDelete(id);

    res.json({ message: 'Class and all related data deleted successfully' });
  } catch (error) {
    console.error('Admin delete class error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
