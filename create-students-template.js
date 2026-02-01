const XLSX = require('xlsx');

// Students from the screenshot - format: { firstName, lastName }
const students = [
  { 'שם פרטי': 'ריף', 'שם משפחה': 'אדרי' },
  { 'שם פרטי': 'ליאור', 'שם משפחה': 'בנדרסקי' },
  { 'שם פרטי': 'בניה חיים', 'שם משפחה': 'גרובר' },
  { 'שם פרטי': 'יותם', 'שם משפחה': 'הנדורגר' },
  { 'שם פרטי': 'יהלי', 'שם משפחה': 'זפרני' },
  { 'שם פרטי': 'עדן', 'שם משפחה': 'טיומקין' },
  { 'שם פרטי': 'הראל אנריקה', 'שם משפחה': 'טייב' },
  { 'שם פרטי': 'יוני', 'שם משפחה': 'ילין לנדסקרו' },
  { 'שם פרטי': 'מאיה', 'שם משפחה': 'ישראל' },
  { 'שם פרטי': 'אורי דוד', 'שם משפחה': 'כחלון' },
  { 'שם פרטי': 'דור', 'שם משפחה': 'לנדמן' },
  { 'שם פרטי': 'מאי', 'שם משפחה': 'סלע' },
  { 'שם פרטי': 'הראל', 'שם משפחה': 'פסטמן' },
  { 'שם פרטי': 'עמית', 'שם משפחה': 'רובין' },
  { 'שם פרטי': 'דנאל', 'שם משפחה': 'שוסטרמן' },
  { 'שם פרטי': 'יונתן', 'שם משפחה': 'שיינברג' },
  { 'שם פרטי': 'עמית', 'שם משפחה': 'שטופמכר' }
];

// Create workbook and worksheet
const ws = XLSX.utils.json_to_sheet(students);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Students');

// Set column widths
ws['!cols'] = [
  { wch: 15 }, // שם פרטי
  { wch: 15 }  // שם משפחה
];

// Write file
XLSX.writeFile(wb, 'students_import.xlsx');
console.log('Created students_import.xlsx with', students.length, 'students');
