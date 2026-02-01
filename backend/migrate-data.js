/**
 * Migration Script - Migrate SQLite data to MongoDB
 * Creates teacher account and migrates students + attendance
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

// MongoDB models
const Teacher = require('./models/Teacher');
const Class = require('./models/Class');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const Holiday = require('./models/Holiday');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance';

async function migrate() {
  console.log('🚀 Starting migration...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Check if SQLite database exists
    const sqliteDbPath = path.join(__dirname, 'attendance.db');
    let sqliteDb;
    let hasSqliteData = false;
    
    try {
      sqliteDb = new Database(sqliteDbPath, { readonly: true });
      hasSqliteData = true;
      console.log('✅ Found SQLite database\n');
    } catch (err) {
      console.log('ℹ️  No SQLite database found, creating fresh data\n');
    }
    
    // 1. Create Teacher Account
    console.log('📝 Creating teacher account...');
    
    let teacher = await Teacher.findOne({ email: 'abeer.abuelzalef@gmail.com' });
    
    if (!teacher) {
      teacher = new Teacher({
        name: 'עביר אבו אל זלף',
        email: 'abeer.abuelzalef@gmail.com',
        password: 'password123' // Will be hashed by pre-save hook
      });
      await teacher.save();
      console.log('   ✅ Teacher created: עביר אבו אל זלף (abeer.abuelzalef@gmail.com)');
      console.log('   📧 Email: abeer.abuelzalef@gmail.com');
      console.log('   🔑 Password: password123\n');
    } else {
      console.log('   ℹ️  Teacher already exists\n');
    }
    
    // 2. Create Class
    console.log('📚 Creating class...');
    
    let cls = await Class.findOne({ name: 'כיתה ג1', teacher: teacher._id });
    
    if (!cls) {
      cls = new Class({
        name: 'כיתה ג1',
        teacher: teacher._id,
        year: '2025-2026',
        description: 'כיתה ג1 - שנת הלימודים תשפ"ו'
      });
      await cls.save();
      console.log('   ✅ Class created: כיתה ג1\n');
    } else {
      console.log('   ℹ️  Class already exists\n');
    }
    
    // 3. Migrate Students
    if (hasSqliteData) {
      console.log('👥 Migrating students...');
      
      const sqliteStudents = sqliteDb.prepare('SELECT * FROM students WHERE active = 1').all();
      
      // Map old IDs to new IDs
      const studentIdMap = {};
      let migratedStudents = 0;
      
      for (const oldStudent of sqliteStudents) {
        // Check if student already exists
        let student = await Student.findOne({ 
          name: oldStudent.name, 
          teacher: teacher._id,
          class: cls._id 
        });
        
        if (!student) {
          student = new Student({
            name: oldStudent.name,
            class: cls._id,
            teacher: teacher._id,
            notes: oldStudent.notes || ''
          });
          await student.save();
          migratedStudents++;
        }
        
        studentIdMap[oldStudent.id] = student._id;
      }
      
      console.log(`   ✅ Migrated ${migratedStudents} students\n`);
      
      // 4. Migrate Attendance
      console.log('📋 Migrating attendance records...');
      
      const sqliteAttendance = sqliteDb.prepare('SELECT * FROM attendance').all();
      let migratedAttendance = 0;
      
      // Use bulk operations for efficiency
      const attendanceOps = [];
      
      for (const oldRecord of sqliteAttendance) {
        const studentId = studentIdMap[oldRecord.student_id];
        
        if (studentId) {
          attendanceOps.push({
            updateOne: {
              filter: { student: studentId, date: oldRecord.date },
              update: {
                $set: {
                  student: studentId,
                  class: cls._id,
                  teacher: teacher._id,
                  date: oldRecord.date,
                  status: oldRecord.status,
                  notes: oldRecord.notes || ''
                }
              },
              upsert: true
            }
          });
        }
      }
      
      if (attendanceOps.length > 0) {
        const result = await Attendance.bulkWrite(attendanceOps);
        migratedAttendance = result.upsertedCount + result.modifiedCount;
      }
      
      console.log(`   ✅ Migrated ${migratedAttendance} attendance records\n`);
      
      // 5. Migrate Holidays
      console.log('🎉 Migrating holidays...');
      
      const sqliteHolidays = sqliteDb.prepare('SELECT * FROM holidays').all();
      let migratedHolidays = 0;
      
      for (const oldHoliday of sqliteHolidays) {
        const exists = await Holiday.findOne({ date: oldHoliday.date });
        
        if (!exists) {
          await Holiday.create({
            date: oldHoliday.date,
            name: oldHoliday.name,
            hebrewName: oldHoliday.hebrew_name,
            year: oldHoliday.year,
            isSchoolHoliday: true
          });
          migratedHolidays++;
        }
      }
      
      console.log(`   ✅ Migrated ${migratedHolidays} holidays\n`);
      
      sqliteDb.close();
    } else {
      // Create sample students if no SQLite data
      console.log('👥 Creating sample students...');
      
      const sampleStudents = [
        'ריף אדרי',
        'ליאור בנדרסקי',
        'בניה חיים גרובר',
        'יותם הנדורגר',
        'יהלי זפרני',
        'עדן טיומקין',
        'הראל אנריקה טייב',
        'יוני ילין לנדסקרו',
        'מאיה ישראל',
        'אורי דוד כחלון',
        'דור לנדמן',
        'מאי סלע',
        'הראל פסטמן',
        'עמית רובין',
        'דנאל שוסטרמן',
        'יונתן שיינברג',
        'עמית שטופמכר'
      ];
      
      for (const name of sampleStudents) {
        const exists = await Student.findOne({ name, teacher: teacher._id });
        if (!exists) {
          await Student.create({
            name,
            class: cls._id,
            teacher: teacher._id
          });
        }
      }
      
      console.log(`   ✅ Created ${sampleStudents.length} students\n`);
    }
    
    // Summary
    const totalStudents = await Student.countDocuments({ teacher: teacher._id });
    const totalAttendance = await Attendance.countDocuments({ teacher: teacher._id });
    const totalHolidays = await Holiday.countDocuments();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('                   MIGRATION COMPLETE                   ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   👩‍🏫 Teacher: עביר אבו אל זלף`);
    console.log(`   📧 Email: abeer.abuelzalef@gmail.com`);
    console.log(`   🔑 Password: password123`);
    console.log(`   📚 Classes: 1 (כיתה ג1)`);
    console.log(`   👥 Students: ${totalStudents}`);
    console.log(`   📋 Attendance Records: ${totalAttendance}`);
    console.log(`   🎉 Holidays: ${totalHolidays}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('🎉 Migration completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
