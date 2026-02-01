const { connectToDatabase } = require('../_lib/db');
const { Student, Class } = require('../_lib/models');
const { verifyAuth } = require('../_lib/auth');
const xlsx = require('xlsx');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAuth(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    await connectToDatabase();
    const teacherId = authResult.teacher._id;
    const { classId, students } = req.body;

    if (!classId || !students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'classId and students array are required' });
    }

    // Verify class belongs to teacher
    const classDoc = await Class.findOne({ _id: classId, teacher: teacherId });
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Create students
    const createdStudents = [];
    for (const studentData of students) {
      const name = studentData.name || studentData['שם'] || studentData['Name'];
      if (name && name.trim()) {
        const student = new Student({
          name: name.trim(),
          class: classId,
          teacher: teacherId
        });
        await student.save();
        createdStudents.push(student);
      }
    }

    res.status(201).json({
      message: `${createdStudents.length} students imported successfully`,
      students: createdStudents
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Server error during import' });
  }
};
