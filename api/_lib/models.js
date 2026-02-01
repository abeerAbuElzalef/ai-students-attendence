const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'admin'], default: 'teacher' },
  lastLogin: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

teacherSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Class Schema
const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Student Schema
const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: Date, required: true },
  present: { type: Boolean, default: false }
});

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

// Holiday Schema
const holidaySchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  name: { type: String, required: true },
  hebrewName: { type: String }
});

// Get or create models (important for serverless to avoid model recompilation)
const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);
const Class = mongoose.models.Class || mongoose.model('Class', classSchema);
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
const Holiday = mongoose.models.Holiday || mongoose.model('Holiday', holidaySchema);

module.exports = { Teacher, Class, Student, Attendance, Holiday };
