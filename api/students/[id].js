const { connectToDatabase } = require('../_lib/db');
const { Student, Attendance } = require('../_lib/models');
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

    // Verify student belongs to teacher
    const student = await Student.findOne({ _id: id, teacher: teacherId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (req.method === 'GET') {
      const populatedStudent = await Student.findById(id).populate('class', 'name');
      return res.json(populatedStudent);
    }

    if (req.method === 'PUT') {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      student.name = name;
      await student.save();
      const populatedStudent = await Student.findById(id).populate('class', 'name');
      return res.json(populatedStudent);
    }

    if (req.method === 'DELETE') {
      // Delete attendance records for this student
      await Attendance.deleteMany({ student: id });
      // Delete the student
      await Student.findByIdAndDelete(id);
      return res.json({ message: 'Student deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Student error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
