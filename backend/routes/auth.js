const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const { generateToken, protect } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new teacher
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'נא למלא את כל השדות' });
    }

    // Check if teacher exists
    const teacherExists = await Teacher.findOne({ email });
    if (teacherExists) {
      return res.status(400).json({ error: 'משתמש עם אימייל זה כבר קיים' });
    }

    // Create teacher
    const teacher = await Teacher.create({
      name,
      email,
      password
    });

    if (teacher) {
      res.status(201).json({
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        token: generateToken(teacher._id)
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login teacher
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'נא למלא אימייל וסיסמה' });
    }

    // Find teacher
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    // Check password
    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    // Update last login
    teacher.lastLogin = new Date();
    await teacher.save();

    res.json({
      _id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      isAdmin: teacher.isAdmin,
      token: generateToken(teacher._id)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current teacher
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      _id: req.teacher._id,
      name: req.teacher.name,
      email: req.teacher.email,
      isAdmin: req.teacher.isAdmin
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update teacher profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const teacher = await Teacher.findById(req.teacher._id);
    
    if (teacher) {
      teacher.name = name || teacher.name;
      teacher.email = email || teacher.email;
      
      if (password) {
        teacher.password = password;
      }
      
      const updatedTeacher = await teacher.save();
      
      res.json({
        _id: updatedTeacher._id,
        name: updatedTeacher.name,
        email: updatedTeacher.email,
        token: generateToken(updatedTeacher._id)
      });
    } else {
      res.status(404).json({ error: 'משתמש לא נמצא' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
