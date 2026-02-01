const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Student = require('../models/Student');
const Class = require('../models/Class');
const { protect } = require('../middleware/auth');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי Excel מותרים'), false);
    }
  }
});

// All routes require authentication
router.use(protect);

// @route   GET /api/students
// @desc    Get all students for logged in teacher (optionally filter by class)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const query = { teacher: req.teacher._id, active: true };
    
    if (req.query.classId) {
      query.class = req.query.classId;
    }
    
    const students = await Student.find(query)
      .populate('class', 'name')
      .sort({ name: 1 });
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/students/:id
// @desc    Get single student
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ 
      _id: req.params.id, 
      teacher: req.teacher._id 
    }).populate('class', 'name');
    
    if (!student) {
      return res.status(404).json({ error: 'התלמיד לא נמצא' });
    }
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/students
// @desc    Create a new student
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { name, classId, notes } = req.body;
    
    if (!name || !classId) {
      return res.status(400).json({ error: 'שם התלמיד וכיתה הם שדות חובה' });
    }
    
    // Verify class belongs to teacher
    const cls = await Class.findOne({ _id: classId, teacher: req.teacher._id });
    if (!cls) {
      return res.status(404).json({ error: 'הכיתה לא נמצאה' });
    }
    
    const student = await Student.create({
      name,
      class: classId,
      teacher: req.teacher._id,
      notes
    });
    
    const populatedStudent = await Student.findById(student._id).populate('class', 'name');
    
    res.status(201).json(populatedStudent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/students/bulk
// @desc    Create multiple students
// @access  Private
router.post('/bulk', async (req, res) => {
  try {
    const { students, classId } = req.body;
    
    if (!students || !Array.isArray(students) || !classId) {
      return res.status(400).json({ error: 'נדרשת רשימת תלמידים וכיתה' });
    }
    
    // Verify class belongs to teacher
    const cls = await Class.findOne({ _id: classId, teacher: req.teacher._id });
    if (!cls) {
      return res.status(404).json({ error: 'הכיתה לא נמצאה' });
    }
    
    const studentsToCreate = students.map(s => ({
      name: s.name,
      class: classId,
      teacher: req.teacher._id,
      notes: s.notes || ''
    }));
    
    const createdStudents = await Student.insertMany(studentsToCreate);
    
    res.status(201).json({ 
      message: `${createdStudents.length} תלמידים נוספו בהצלחה`,
      count: createdStudents.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/students/import
// @desc    Import students from Excel file
// @access  Private
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'נא להעלות קובץ Excel' });
    }
    
    const { classId } = req.body;
    
    if (!classId) {
      return res.status(400).json({ error: 'נא לבחור כיתה' });
    }
    
    // Verify class belongs to teacher
    const cls = await Class.findOne({ _id: classId, teacher: req.teacher._id });
    if (!cls) {
      return res.status(404).json({ error: 'הכיתה לא נמצאה' });
    }
    
    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({ error: 'הקובץ ריק או בפורמט שגוי' });
    }
    
    // Extract student names (support multiple column names)
    const students = [];
    for (const row of data) {
      const name = row['שם'] || row['שם התלמיד'] || row['name'] || row['Name'] || row['שם מלא'];
      const notes = row['הערות'] || row['notes'] || row['Notes'] || '';
      
      if (name && name.trim()) {
        students.push({
          name: name.trim(),
          class: classId,
          teacher: req.teacher._id,
          notes: notes.toString().trim()
        });
      }
    }
    
    if (students.length === 0) {
      return res.status(400).json({ 
        error: 'לא נמצאו תלמידים בקובץ. ודא שיש עמודה בשם "שם" או "שם התלמיד"' 
      });
    }
    
    const createdStudents = await Student.insertMany(students);
    
    res.status(201).json({ 
      message: `${createdStudents.length} תלמידים יובאו בהצלחה`,
      count: createdStudents.length 
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/students/template
// @desc    Download Excel template for importing students
// @access  Private
router.get('/download/template', async (req, res) => {
  try {
    const templateData = [
      { 'שם התלמיד': 'ישראל ישראלי', 'הערות': '' },
      { 'שם התלמיד': 'יעל כהן', 'הערות': 'הערה לדוגמה' },
      { 'שם התלמיד': 'דוד לוי', 'הערות': '' }
    ];
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'תלמידים');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/students/:id
// @desc    Update a student
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { name, classId, notes } = req.body;
    
    const updateData = { name, notes };
    
    if (classId) {
      // Verify class belongs to teacher
      const cls = await Class.findOne({ _id: classId, teacher: req.teacher._id });
      if (!cls) {
        return res.status(404).json({ error: 'הכיתה לא נמצאה' });
      }
      updateData.class = classId;
    }
    
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, teacher: req.teacher._id },
      updateData,
      { new: true, runValidators: true }
    ).populate('class', 'name');
    
    if (!student) {
      return res.status(404).json({ error: 'התלמיד לא נמצא' });
    }
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/students/:id
// @desc    Delete a student (soft delete)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, teacher: req.teacher._id },
      { active: false },
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({ error: 'התלמיד לא נמצא' });
    }
    
    res.json({ message: 'התלמיד נמחק בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/students/:id/move
// @desc    Move student to another class
// @access  Private
router.post('/:id/move', async (req, res) => {
  try {
    const { classId } = req.body;
    
    // Verify class belongs to teacher
    const cls = await Class.findOne({ _id: classId, teacher: req.teacher._id });
    if (!cls) {
      return res.status(404).json({ error: 'הכיתה לא נמצאה' });
    }
    
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, teacher: req.teacher._id },
      { class: classId },
      { new: true }
    ).populate('class', 'name');
    
    if (!student) {
      return res.status(404).json({ error: 'התלמיד לא נמצא' });
    }
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
