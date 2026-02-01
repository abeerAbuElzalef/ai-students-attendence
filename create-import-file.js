const xlsx = require('xlsx');

const students = [
  { 'שם': 'אדרי ריף' },
  { 'שם': 'בנדרסקי ליאור' },
  { 'שם': 'גרובר בניה חיים' },
  { 'שם': 'הנדורגר יותם' },
  { 'שם': 'זפרני יהלי' },
  { 'שם': 'טיומקין עדן' },
  { 'שם': 'טייב הראל אנריקה' },
  { 'שם': 'ילין לנדסקרו יוני' },
  { 'שם': 'ישראל מאיה' },
  { 'שם': 'כחלון אורי דוד' },
  { 'שם': 'לנדמן דור' },
  { 'שם': 'סלע מאי' },
  { 'שם': 'פסטמן הראל' },
  { 'שם': 'רובין עמית' },
  { 'שם': 'שוסטרמן דנאל' },
  { 'שם': 'שיינברג יונתן' },
  { 'שם': 'שטופמכר עמית' }
];

const ws = xlsx.utils.json_to_sheet(students);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Students');
xlsx.writeFile(wb, 'students_import.xlsx');

console.log('✅ File created: students_import.xlsx');
console.log('📁 Location: C:\\project\\ai-student-attendence\\students_import.xlsx');
console.log('');
console.log('Students in file:');
students.forEach((s, i) => console.log(`  ${i + 1}. ${s['שם']}`));
