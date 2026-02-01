const { connectToDatabase } = require('../_lib/db');
const { Class, Student, Attendance } = require('../_lib/models');
const { verifyAdmin } = require('../_lib/auth');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
      const classes = await Class.find()
        .populate('teacher', 'name email')
        .sort({ createdAt: -1 });

      // Get student count for each class
      const classesWithStats = await Promise.all(classes.map(async (classDoc) => {
        const studentCount = await Student.countDocuments({ class: classDoc._id });
        return {
          ...classDoc.toObject(),
          studentCount
        };
      }));

      return res.json(classesWithStats);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin classes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
