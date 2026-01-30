const Database = require('better-sqlite3');
const path = require('path');

// Database file will be stored in the same directory - portable!
const dbPath = path.join(__dirname, 'attendance.db');
const db = new Database(dbPath);

// Initialize database tables
function initializeDatabase() {
  // Students table
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      active INTEGER DEFAULT 1
    )
  `);

  // Attendance table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      UNIQUE(student_id, date)
    )
  `);

  // Holidays table (for caching Israeli holidays)
  db.exec(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      hebrew_name TEXT,
      year INTEGER NOT NULL
    )
  `);

  console.log('Database initialized successfully');
}

// Student operations
const studentOps = {
  getAll: () => {
    return db.prepare('SELECT * FROM students WHERE active = 1 ORDER BY name').all();
  },

  getById: (id) => {
    return db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  },

  create: (name, className = null) => {
    const stmt = db.prepare('INSERT INTO students (name, class_name) VALUES (?, ?)');
    const result = stmt.run(name, className);
    return { id: result.lastInsertRowid, name, class_name: className };
  },

  update: (id, name, className) => {
    const stmt = db.prepare('UPDATE students SET name = ?, class_name = ? WHERE id = ?');
    stmt.run(name, className, id);
    return studentOps.getById(id);
  },

  delete: (id) => {
    // Soft delete - mark as inactive
    const stmt = db.prepare('UPDATE students SET active = 0 WHERE id = ?');
    stmt.run(id);
  },

  bulkCreate: (students) => {
    const stmt = db.prepare('INSERT INTO students (name, class_name) VALUES (?, ?)');
    const insertMany = db.transaction((students) => {
      const results = [];
      for (const student of students) {
        const result = stmt.run(student.name, student.className || null);
        results.push({ id: result.lastInsertRowid, name: student.name, class_name: student.className });
      }
      return results;
    });
    return insertMany(students);
  }
};

// Attendance operations
const attendanceOps = {
  getByDate: (date) => {
    return db.prepare(`
      SELECT a.*, s.name as student_name, s.class_name 
      FROM attendance a 
      JOIN students s ON a.student_id = s.id 
      WHERE a.date = ? AND s.active = 1
    `).all(date);
  },

  getByDateRange: (startDate, endDate) => {
    return db.prepare(`
      SELECT a.*, s.name as student_name, s.class_name 
      FROM attendance a 
      JOIN students s ON a.student_id = s.id 
      WHERE a.date BETWEEN ? AND ? AND s.active = 1
      ORDER BY a.date, s.name
    `).all(startDate, endDate);
  },

  getByStudent: (studentId, startDate, endDate) => {
    return db.prepare(`
      SELECT * FROM attendance 
      WHERE student_id = ? AND date BETWEEN ? AND ?
      ORDER BY date
    `).all(studentId, startDate, endDate);
  },

  getMonthlyReport: (year, month) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    return db.prepare(`
      SELECT s.id, s.name, s.class_name, a.date, a.status, a.notes
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date BETWEEN ? AND ?
      WHERE s.active = 1
      ORDER BY s.name, a.date
    `).all(startDate, endDate);
  },

  markAttendance: (studentId, date, status, notes = null) => {
    const stmt = db.prepare(`
      INSERT INTO attendance (student_id, date, status, notes) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(student_id, date) DO UPDATE SET status = ?, notes = ?
    `);
    stmt.run(studentId, date, status, notes, status, notes);
    return { studentId, date, status, notes };
  },

  bulkMarkAttendance: (records) => {
    const stmt = db.prepare(`
      INSERT INTO attendance (student_id, date, status, notes) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status, notes = excluded.notes
    `);
    const insertMany = db.transaction((records) => {
      for (const record of records) {
        stmt.run(record.studentId, record.date, record.status, record.notes || null);
      }
    });
    insertMany(records);
    return records;
  },

  getStats: (startDate, endDate) => {
    return db.prepare(`
      SELECT 
        student_id,
        s.name as student_name,
        s.class_name,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_count,
        COUNT(*) as total_records
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.date BETWEEN ? AND ? AND s.active = 1
      GROUP BY student_id
      ORDER BY s.name
    `).all(startDate, endDate);
  }
};

// Holiday operations
const holidayOps = {
  getByYear: (year) => {
    return db.prepare('SELECT * FROM holidays WHERE year = ?').all(year);
  },

  getByDate: (date) => {
    return db.prepare('SELECT * FROM holidays WHERE date = ?').get(date);
  },

  getByDateRange: (startDate, endDate) => {
    return db.prepare('SELECT * FROM holidays WHERE date BETWEEN ? AND ?').all(startDate, endDate);
  },

  save: (date, name, hebrewName, year) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO holidays (date, name, hebrew_name, year) 
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(date, name, hebrewName, year);
  },

  bulkSave: (holidays) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO holidays (date, name, hebrew_name, year) 
      VALUES (?, ?, ?, ?)
    `);
    const insertMany = db.transaction((holidays) => {
      for (const h of holidays) {
        stmt.run(h.date, h.name, h.hebrewName, h.year);
      }
    });
    insertMany(holidays);
  }
};

module.exports = {
  db,
  initializeDatabase,
  studentOps,
  attendanceOps,
  holidayOps
};
