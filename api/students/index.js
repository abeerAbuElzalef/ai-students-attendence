const { connectToDatabase } = require('../_lib/db');
const { Student, Class } = require('../_lib/models');
const { verifyAuth } = require('../_lib/auth');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    const teacherId = authResult.teacher._id;
    const { classId } = req.query;

    if (req.method === 'GET') {
      let query = { teacher: teacherId };
      if (classId) {
        query.class = classId;
      }
      const students = await Student.find(query)
        .populate('class', 'name')
        .sort({ name: 1 });
      return res.json(students);
    }

    if (req.method === 'POST') {
      const { name, classId: bodyClassId } = req.body;
      
      if (!name || !bodyClassId) {
        return res.status(400).json({ error: 'Name and classId are required' });
      }

      // Verify class belongs to teacher
      const classDoc = await Class.findOne({ _id: bodyClassId, teacher: teacherId });
      if (!classDoc) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const student = new Student({
        name,
        class: bodyClassId,
        teacher: teacherId
      });
      await student.save();

      const populatedStudent = await Student.findById(student._id).populate('class', 'name');
      return res.status(201).json(populatedStudent);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Students error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
