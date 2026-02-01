const { connectToDatabase } = require('../_lib/db');
const { Teacher, Class, Student, Attendance } = require('../_lib/models');
const { verifyAdmin } = require('../_lib/auth');

module.exports = async (req, res) => {
  // Set CORS headers
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

    if (req.method === 'GET') {
      const teachers = await Teacher.find()
        .select('-password')
        .sort({ createdAt: -1 });

      // Get class count for each teacher
      const teachersWithStats = await Promise.all(teachers.map(async (teacher) => {
        const classCount = await Class.countDocuments({ teacher: teacher._id });
        const studentCount = await Student.countDocuments({ teacher: teacher._id });
        return {
          ...teacher.toObject(),
          classCount,
          studentCount
        };
      }));

      return res.json(teachersWithStats);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin teachers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
