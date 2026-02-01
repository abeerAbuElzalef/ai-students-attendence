const { connectToDatabase } = require('../_lib/db');
const { Attendance, Student, Class } = require('../_lib/models');
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
    const { date, classId } = req.query;

    if (req.method === 'GET') {
      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get students for this teacher (optionally filtered by class)
      let studentQuery = { teacher: teacherId };
      if (classId) {
        studentQuery.class = classId;
      }
      const students = await Student.find(studentQuery).populate('class', 'name');

      // Get attendance records for this date
      const attendanceRecords = await Attendance.find({
        student: { $in: students.map(s => s._id) },
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      // Map attendance to students
      const result = students.map(student => {
        const record = attendanceRecords.find(a => a.student.toString() === student._id.toString());
        return {
          _id: student._id,
          id: student._id,
          name: student.name,
          class: student.class,
          present: record ? record.present : false
        };
      });

      return res.json(result);
    }

    if (req.method === 'POST') {
      const { studentId, date: bodyDate, present, classId: bodyClassId } = req.body;

      if (!studentId || !bodyDate) {
        return res.status(400).json({ error: 'studentId and date are required' });
      }

      // Verify student belongs to teacher
      const student = await Student.findOne({ _id: studentId, teacher: teacherId });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const attendanceDate = new Date(bodyDate);
      attendanceDate.setHours(12, 0, 0, 0);

      // Upsert attendance record
      const attendance = await Attendance.findOneAndUpdate(
        { student: studentId, date: attendanceDate },
        { 
          student: studentId, 
          class: student.class,
          date: attendanceDate, 
          present: present 
        },
        { upsert: true, new: true }
      );

      return res.json(attendance);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
