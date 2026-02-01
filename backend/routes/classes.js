const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/classes
// @desc    Get all classes for logged in teacher
// @access  Private
router.get('/', async (req, res) => {
  try {
    const classes = await Class.find({ teacher: req.teacher._id })
      .sort({ createdAt: -1 });
    
    // Get student count for each class
    const classesWithCount = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({ 
          class: cls._id, 
          active: true 
        });
        return {
          ...cls.toObject(),
          studentCount
        };
      })
    );
    
    res.json(classesWithCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/classes/:id
// @desc    Get single class
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const cls = await Class.findOne({ 
      _id: req.params.id, 
      teacher: req.teacher._id 
    });
    
    if (!cls) {
      return res.status(404).json({ error: 'הכיתה לא נמצאה' });
    }
    
    const studentCount = await Student.countDocuments({ 
      class: cls._id, 
      active: true 
    });
    
    res.json({ ...cls.toObject(), studentCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/classes
// @desc    Create a new class
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { name, year, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'שם הכיתה הוא שדה חובה' });
    }
    
    const cls = await Class.create({
      name,
      year,
      description,
      teacher: req.teacher._id
    });
    
    res.status(201).json(cls);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'כיתה בשם זה כבר קיימת' });
    }
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/classes/:id
// @desc    Update a class
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { name, year, description } = req.body;
    
    const cls = await Class.findOneAndUpdate(
      { _id: req.params.id, teacher: req.teacher._id },
      { name, year, description },
      { new: true, runValidators: true }
    );
    
    if (!cls) {
      return res.status(404).json({ error: 'הכיתה לא נמצאה' });
    }
    
    res.json(cls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/classes/:id
// @desc    Delete a class
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const cls = await Class.findOne({ 
      _id: req.params.id, 
      teacher: req.teacher._id 
    });
    
    if (!cls) {
      return res.status(404).json({ error: 'הכיתה לא נמצאה' });
    }
    
    // Check if class has students
    const studentCount = await Student.countDocuments({ class: cls._id });
    if (studentCount > 0) {
      return res.status(400).json({ 
        error: `לא ניתן למחוק כיתה עם ${studentCount} תלמידים. יש להעביר או למחוק את התלמידים קודם.` 
      });
    }
    
    await cls.deleteOne();
    
    res.json({ message: 'הכיתה נמחקה בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
