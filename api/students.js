const { connectToDatabase } = require('./_lib/db');
const { Student, Class, Attendance } = require('./_lib/models');
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
    const path = url.pathname;
    const classId = url.searchParams.get('classId');

    // POST /api/students/import - Import students
    if (path === '/api/students/import' && req.method === 'POST') {
      const { classId: bodyClassId, students } = req.body;
      if (!bodyClassId || !students || !Array.isArray(students)) {
        return res.status(400).json({ error: 'classId and students array are required' });
      }
      const classDoc = await Class.findOne({ _id: bodyClassId, teacher: teacherId });
      if (!classDoc) {
        return res.status(404).json({ error: 'Class not found' });
      }
      const createdStudents = [];
      for (const studentData of students) {
        const name = studentData.name || studentData['שם'] || studentData['Name'];
        if (name && name.trim()) {
          const student = new Student({ name: name.trim(), class: bodyClassId, teacher: teacherId });
          await student.save();
          createdStudents.push(student);
        }
      }
      return res.status(201).json({ message: `${createdStudents.length} students imported`, students: createdStudents });
    }

    // Extract ID from URL: /api/students/123
    const urlParts = path.split('/');
    const id = urlParts.length > 3 && urlParts[3] !== 'import' ? urlParts[3] : null;

    // GET /api/students - List all students
    if (!id && req.method === 'GET') {
      let query = { teacher: teacherId };
      if (classId) query.class = classId;
      const students = await Student.find(query).populate('class', 'name').sort({ name: 1 });
      return res.json(students);
    }

    // POST /api/students - Create new student
    if (!id && req.method === 'POST') {
      const { name, classId: bodyClassId } = req.body;
      if (!name || !bodyClassId) {
        return res.status(400).json({ error: 'Name and classId are required' });
      }
      const classDoc = await Class.findOne({ _id: bodyClassId, teacher: teacherId });
      if (!classDoc) {
        return res.status(404).json({ error: 'Class not found' });
      }
      const student = new Student({ name, class: bodyClassId, teacher: teacherId });
      await student.save();
      const populated = await Student.findById(student._id).populate('class', 'name');
      return res.status(201).json(populated);
    }

    // Operations on specific student
    if (id) {
      const student = await Student.findOne({ _id: id, teacher: teacherId });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (req.method === 'GET') {
        const populated = await Student.findById(id).populate('class', 'name');
        return res.json(populated);
      }

      if (req.method === 'PUT') {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        student.name = name;
        await student.save();
        const populated = await Student.findById(id).populate('class', 'name');
        return res.json(populated);
      }

      if (req.method === 'DELETE') {
        await Attendance.deleteMany({ student: id });
        await Student.findByIdAndDelete(id);
        return res.json({ message: 'Student deleted successfully' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Students error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
