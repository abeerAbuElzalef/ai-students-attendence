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
    const action = url.searchParams.get('action');
    const id = url.searchParams.get('id');
    const classId = url.searchParams.get('classId');

    // POST /api/students/import - Import students
    if (action === 'import' && req.method === 'POST') {
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
        const firstName = studentData.firstName || studentData['שם פרטי'] || '';
        const lastName = studentData.lastName || studentData['שם משפחה'] || '';
        
        if (firstName.trim() && lastName.trim()) {
          const student = new Student({ 
            firstName: firstName.trim(), 
            lastName: lastName.trim(),
            class: bodyClassId, 
            teacher: teacherId 
          });
          await student.save();
          createdStudents.push(student);
        }
      }
      return res.status(201).json({ message: `${createdStudents.length} תלמידים יובאו בהצלחה`, students: createdStudents });
    }

    // GET /api/students - List all students
    if (!id && req.method === 'GET') {
      let query = { teacher: teacherId };
      if (classId) query.class = classId;
      const students = await Student.find(query).populate('class', 'name').sort({ lastName: 1, firstName: 1 });
      return res.json(students);
    }

    // POST /api/students - Create new student
    if (!id && req.method === 'POST') {
      const { firstName, lastName, classId: bodyClassId } = req.body;
      if (!firstName || !lastName || !bodyClassId) {
        return res.status(400).json({ error: 'firstName, lastName and classId are required' });
      }
      const classDoc = await Class.findOne({ _id: bodyClassId, teacher: teacherId });
      if (!classDoc) {
        return res.status(404).json({ error: 'Class not found' });
      }
      const student = new Student({ firstName, lastName, class: bodyClassId, teacher: teacherId });
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
        const { firstName, lastName } = req.body;
        if (!firstName || !lastName) {
          return res.status(400).json({ error: 'firstName and lastName are required' });
        }
        student.firstName = firstName;
        student.lastName = lastName;
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
