const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'שם הכיתה הוא שדה חובה'],
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  year: {
    type: String,
    default: () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      // School year starts in September
      if (month >= 8) {
        return `${year}-${year + 1}`;
      }
      return `${year - 1}-${year}`;
    }
  },
  description: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique class name per teacher per year
classSchema.index({ name: 1, teacher: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
