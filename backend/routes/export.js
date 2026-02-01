const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Holiday = require('../models/Holiday');
const { protect } = require('../middleware/auth');
const { isSchoolDay } = require('../holidays');

// All routes require authentication
router.use(protect);

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// @route   GET /api/export/monthly/:year/:month
// @desc    Export monthly attendance report to Excel
// @access  Private
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const { classId } = req.query;
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    
    // Get students
    const studentQuery = { teacher: req.teacher._id, active: true };
    if (classId) {
      studentQuery.class = classId;
    }
    const students = await Student.find(studentQuery)
      .populate('class', 'name')
      .sort({ name: 1 });
    
    // Get attendance
    const attendanceQuery = {
      teacher: req.teacher._id,
      date: { $gte: startDate, $lte: endDate }
    };
    if (classId) {
      attendanceQuery.class = classId;
    }
    const attendance = await Attendance.find(attendanceQuery);
    
    // Create attendance map
    const attendanceMap = {};
    for (const record of attendance) {
      const key = `${record.student}-${record.date}`;
      attendanceMap[key] = record;
    }
    
    // Get holidays
    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    });
    const holidayMap = {};
    for (const h of holidays) {
      holidayMap[h.date] = h;
    }
    
    // Build headers
    const headers = ['שם התלמיד', 'כיתה'];
    const dateHeaders = [];
    
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
      
      dateHeaders.push({
        date: dateStr,
        display: `${day} (${dayNames[dayOfWeek]})`,
        isShabbat: dayOfWeek === 6,
        isHoliday: holidayMap[dateStr] || null
      });
      
      headers.push(`${day} (${dayNames[dayOfWeek]})`);
    }
    
    headers.push('נוכחות', 'חיסורים', 'איחורים', 'מוצדקים', 'אחוז נוכחות');
    
    // Build data rows
    const data = [headers];
    
    for (const student of students) {
      const row = [student.name, student.class?.name || ''];
      
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      let schoolDaysCount = 0;
      
      for (const dateInfo of dateHeaders) {
        const key = `${student._id}-${dateInfo.date}`;
        const record = attendanceMap[key];
        const schoolDayInfo = isSchoolDay(dateInfo.date);
        
        let cellValue = '';
        
        if (!schoolDayInfo.isSchoolDay) {
          cellValue = dateInfo.isShabbat ? 'ש' : 'חג';
        } else {
          schoolDaysCount++;
          
          if (record) {
            switch (record.status) {
              case 'present':
                cellValue = '✓';
                presentCount++;
                break;
              case 'absent':
                cellValue = '✗';
                absentCount++;
                break;
              case 'late':
                cellValue = 'א';
                lateCount++;
                break;
              case 'excused':
                cellValue = 'מ';
                excusedCount++;
                break;
            }
          } else {
            cellValue = '-';
          }
        }
        
        row.push(cellValue);
      }
      
      row.push(presentCount);
      row.push(absentCount);
      row.push(lateCount);
      row.push(excusedCount);
      
      const attendanceRate = schoolDaysCount > 0 
        ? Math.round((presentCount / schoolDaysCount) * 100) 
        : 0;
      row.push(`${attendanceRate}%`);
      
      data.push(row);
    }
    
    // Add legend
    data.push([]);
    data.push(['מקרא:']);
    data.push(['✓ = נוכח', '✗ = חיסור', 'א = איחור', 'מ = חיסור מוצדק', 'ש = שבת', 'חג = חג']);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!dir'] = 'rtl';
    
    // Set column widths
    const colWidths = [{ wch: 20 }, { wch: 12 }];
    for (let i = 0; i < lastDay; i++) {
      colWidths.push({ wch: 8 });
    }
    colWidths.push({ wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 });
    worksheet['!cols'] = colWidths;
    
    const sheetName = `${HEBREW_MONTHS[month - 1]} ${year}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `נוכחות_${HEBREW_MONTHS[month - 1]}_${year}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/export/student/:id/:year
// @desc    Export student yearly report to Excel
// @access  Private
router.get('/student/:id/:year', async (req, res) => {
  try {
    const { id, year } = req.params;
    
    const student = await Student.findOne({ 
      _id: id, 
      teacher: req.teacher._id 
    }).populate('class', 'name');
    
    if (!student) {
      return res.status(404).json({ error: 'התלמיד לא נמצא' });
    }
    
    const workbook = XLSX.utils.book_new();
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    
    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      
      const attendance = await Attendance.find({
        student: id,
        date: { $gte: startDate, $lte: endDate }
      });
      
      const data = [['תאריך', 'יום', 'סטטוס', 'הערות']];
      
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        
        const record = attendance.find(a => a.date === dateStr);
        const schoolDayInfo = isSchoolDay(dateStr);
        
        let status = '';
        let notes = '';
        
        if (!schoolDayInfo.isSchoolDay) {
          status = schoolDayInfo.reason;
        } else if (record) {
          const statusMap = {
            'present': 'נוכח',
            'absent': 'חיסור',
            'late': 'איחור',
            'excused': 'חיסור מוצדק'
          };
          status = statusMap[record.status] || record.status;
          notes = record.notes || '';
        } else {
          status = 'לא דווח';
        }
        
        data.push([dateStr, dayNames[dayOfWeek], status, notes]);
      }
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      worksheet['!dir'] = 'rtl';
      worksheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 30 }];
      
      XLSX.utils.book_append_sheet(workbook, worksheet, HEBREW_MONTHS[month - 1]);
    }
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `נוכחות_${student.name}_${year}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
