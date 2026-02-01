const { connectToDatabase } = require('./_lib/db');
const { Class, Student, Attendance } = require('./_lib/models');
const { verifyAuth } = require('./_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.searchParams.get('id');

    // GET /api/classes - List all classes with student count
    if (!id && req.method === 'GET') {
      const classes = await Class.find({ teacher: teacherId }).sort({ createdAt: -1 });
      
      // Add student count to each class
      const classesWithCount = await Promise.all(classes.map(async (classDoc) => {
        const studentCount = await Student.countDocuments({ class: classDoc._id });
        return { ...classDoc.toObject(), studentCount };
      }));
      
      return res.json(classesWithCount);
    }

    // POST /api/classes - Create new class
    if (!id && req.method === 'POST') {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Class name is required' });
      }
      const newClass = new Class({ name, teacher: teacherId });
      await newClass.save();
      return res.status(201).json(newClass);
    }

    // Operations on specific class
    if (id) {
      const classDoc = await Class.findOne({ _id: id, teacher: teacherId });
      if (!classDoc) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // GET /api/classes/:id
      if (req.method === 'GET') {
        return res.json(classDoc);
      }

      // PUT /api/classes/:id
      if (req.method === 'PUT') {
        const { name } = req.body;
        if (!name) {
          return res.status(400).json({ error: 'Class name is required' });
        }
        classDoc.name = name;
        await classDoc.save();
        return res.json(classDoc);
      }

      // DELETE /api/classes/:id
      if (req.method === 'DELETE') {
        const students = await Student.find({ class: id });
        const studentIds = students.map(s => s._id);
        await Attendance.deleteMany({ student: { $in: studentIds } });
        await Student.deleteMany({ class: id });
        await Class.findByIdAndDelete(id);
        return res.json({ message: 'Class deleted successfully' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Classes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
