/**
 * Excel Export Module for Attendance Reports
 */

const XLSX = require('xlsx');
const { attendanceOps, studentOps, holidayOps } = require('./database');
const { isSchoolDay, formatDate } = require('./holidays');

/**
 * Generate monthly attendance report as Excel buffer
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Buffer} Excel file buffer
 */
function generateMonthlyReport(year, month) {
  const students = studentOps.getAll();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  
  // Calculate end date (last day of month)
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  
  // Get all attendance records for the month
  const attendanceRecords = attendanceOps.getByDateRange(startDate, endDate);
  
  // Create a map for quick lookup
  const attendanceMap = {};
  for (const record of attendanceRecords) {
    const key = `${record.student_id}-${record.date}`;
    attendanceMap[key] = record;
  }
  
  // Get holidays for the month
  const holidays = holidayOps.getByDateRange(startDate, endDate);
  const holidayMap = {};
  for (const h of holidays) {
    holidayMap[h.date] = h;
  }
  
  // Build header row with dates
  const headers = ['שם התלמיד', 'כיתה'];
  const dateHeaders = [];
  
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    
    // Day names in Hebrew
    const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    const dayName = dayNames[dayOfWeek];
    
    dateHeaders.push({
      date: dateStr,
      display: `${day} (${dayName})`,
      isShabbat: dayOfWeek === 6,
      isHoliday: holidayMap[dateStr] || null
    });
    
    headers.push(`${day} (${dayName})`);
  }
  
  // Add summary columns
  headers.push('נוכחות', 'חיסורים', 'איחורים', 'מוצדקים', 'אחוז נוכחות');
  
  // Build data rows
  const data = [headers];
  
  for (const student of students) {
    const row = [student.name, student.class_name || ''];
    
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let schoolDaysCount = 0;
    
    for (const dateInfo of dateHeaders) {
      const key = `${student.id}-${dateInfo.date}`;
      const attendance = attendanceMap[key];
      const schoolDayInfo = isSchoolDay(dateInfo.date);
      
      let cellValue = '';
      
      if (!schoolDayInfo.isSchoolDay) {
        // Holiday or Shabbat
        cellValue = dateInfo.isShabbat ? 'ש' : 'חג';
      } else {
        schoolDaysCount++;
        
        if (attendance) {
          switch (attendance.status) {
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
    
    // Add summary columns
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
  
  // Add legend at the bottom
  data.push([]);
  data.push(['מקרא:']);
  data.push(['✓ = נוכח', '✗ = חיסור', 'א = איחור', 'מ = חיסור מוצדק', 'ש = שבת', 'חג = חג']);
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set RTL direction for Hebrew
  worksheet['!dir'] = 'rtl';
  
  // Set column widths
  const colWidths = [{ wch: 20 }, { wch: 10 }];
  for (let i = 0; i < lastDay; i++) {
    colWidths.push({ wch: 8 });
  }
  colWidths.push({ wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 });
  worksheet['!cols'] = colWidths;
  
  // Get Hebrew month name
  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  const sheetName = `${hebrewMonths[month - 1]} ${year}`;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return {
    buffer,
    filename: `נוכחות_${hebrewMonths[month - 1]}_${year}.xlsx`
  };
}

/**
 * Generate student-specific report
 * @param {number} studentId - Student ID
 * @param {number} year - Year
 * @returns {Buffer} Excel file buffer
 */
function generateStudentReport(studentId, year) {
  const student = studentOps.getById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }
  
  const workbook = XLSX.utils.book_new();
  
  // Create a sheet for each month
  for (let month = 1; month <= 12; month++) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    
    const attendance = attendanceOps.getByStudent(studentId, startDate, endDate);
    
    const data = [['תאריך', 'יום', 'סטטוס', 'הערות']];
    
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    
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
    
    const hebrewMonths = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!dir'] = 'rtl';
    worksheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 30 }];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, hebrewMonths[month - 1]);
  }
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return {
    buffer,
    filename: `נוכחות_${student.name}_${year}.xlsx`
  };
}

module.exports = {
  generateMonthlyReport,
  generateStudentReport
};
