const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  hebrewName: {
    type: String
  },
  year: {
    type: Number,
    required: true
  },
  isSchoolHoliday: {
    type: Boolean,
    default: true
  }
});

// Index for faster queries
holidaySchema.index({ year: 1 });
holidaySchema.index({ date: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
