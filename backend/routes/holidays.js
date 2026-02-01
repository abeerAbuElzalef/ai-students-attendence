const express = require('express');
const router = express.Router();
const Holiday = require('../models/Holiday');
const { protect } = require('../middleware/auth');
const { getHolidaysForYear, isSchoolDay, getNonSchoolDays } = require('../holidays');

// All routes require authentication
router.use(protect);

// @route   GET /api/holidays/:year
// @desc    Get holidays for a year
// @access  Private
router.get('/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    
    let holidays = await Holiday.find({ year });
    
    // If not cached, calculate and save
    if (holidays.length === 0) {
      const yearHolidays = getHolidaysForYear(year);
      
      if (yearHolidays.length > 0) {
        await Holiday.insertMany(yearHolidays.map(h => ({
          date: h.date,
          name: h.name,
          hebrewName: h.hebrewName,
          year: h.year,
          isSchoolHoliday: h.isSchoolHoliday
        })), { ordered: false }).catch(() => {});
        
        holidays = await Holiday.find({ year });
      }
    }
    
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/holidays/check/:date
// @desc    Check if a date is a school day
// @access  Private
router.get('/check/:date', async (req, res) => {
  try {
    const result = isSchoolDay(req.params.date);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/holidays/non-school-days
// @desc    Get non-school days for a date range
// @access  Private
router.get('/non-school-days', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'נדרשים תאריך התחלה וסיום' });
    }
    
    const nonSchoolDays = getNonSchoolDays(startDate, endDate);
    res.json(nonSchoolDays);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
