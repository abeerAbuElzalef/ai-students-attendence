import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiCalendar, FiUser, FiFileText, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { exportApi, studentApi } from '../api';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function ExportPanel({ classId, className }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Monthly export state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Student export state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentYear, setStudentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (classId) {
      loadStudents();
    }
  }, [classId]);

  const loadStudents = async () => {
    try {
      const response = await studentApi.getAll(classId);
      setStudents(response.data);
    } catch (error) {
      toast.error('שגיאה בטעינת התלמידים');
    }
    setLoading(false);
  };

  // Helper function to download blob as file
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleMonthlyExport = async () => {
    setExporting(true);
    try {
      const response = await exportApi.downloadMonthlyReport(selectedYear, selectedMonth, classId);
      const filename = `attendance_${className}_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
      downloadBlob(response.data, filename);
      toast.success('הקובץ הורד בהצלחה');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('שגיאה בהורדת הדוח');
    }
    setExporting(false);
  };

  const handleStudentExport = async () => {
    if (!selectedStudent) {
      toast.error('נא לבחור תלמיד');
      return;
    }
    setExporting(true);
    try {
      const student = students.find(s => s._id === selectedStudent);
      const response = await exportApi.downloadStudentReport(selectedStudent, studentYear);
      const filename = `student_${student?.name || 'report'}_${studentYear}.xlsx`;
      downloadBlob(response.data, filename);
      toast.success('הקובץ הורד בהצלחה');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('שגיאה בהורדת הדוח');
    }
    setExporting(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Report Export */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <FiCalendar size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">דוח נוכחות חודשי</h3>
            <p className="text-slate-400 text-sm">ייצוא נוכחות {className} לחודש מסוים</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">חודש</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="input-field"
              >
                {HEBREW_MONTHS.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">שנה</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="input-field"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleMonthlyExport}
            disabled={exporting}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {exporting ? <FiLoader size={20} className="animate-spin" /> : <FiDownload size={20} />}
            <span>{exporting ? 'מוריד...' : 'הורד דוח חודשי'}</span>
          </button>
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <FiFileText size={16} />
            <span className="text-sm">תצוגה מקדימה של הקובץ</span>
          </div>
          <div className="text-sm text-slate-300">
            <p>הקובץ יכלול:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>שם כל תלמיד</li>
              <li>סטטוס נוכחות לכל יום בחודש</li>
              <li>סימון חגים ושבתות</li>
              <li>סיכום נוכחות, חיסורים ואיחורים</li>
              <li>אחוז נוכחות כולל</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Student Report Export */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
            <FiUser size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">דוח תלמיד שנתי</h3>
            <p className="text-slate-400 text-sm">ייצוא נוכחות תלמיד ספציפי לשנה שלמה</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">בחר תלמיד</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="input-field"
            >
              <option value="">-- בחר תלמיד --</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">שנה</label>
            <select
              value={studentYear}
              onChange={(e) => setStudentYear(parseInt(e.target.value))}
              className="input-field"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleStudentExport}
            disabled={!selectedStudent || exporting}
            className={`
              w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all
              ${selectedStudent && !exporting
                ? 'btn-primary' 
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {exporting ? <FiLoader size={20} className="animate-spin" /> : <FiDownload size={20} />}
            <span>{exporting ? 'מוריד...' : 'הורד דוח תלמיד'}</span>
          </button>
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <FiFileText size={16} />
            <span className="text-sm">תצוגה מקדימה של הקובץ</span>
          </div>
          <div className="text-sm text-slate-300">
            <p>הקובץ יכלול:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li>גיליון נפרד לכל חודש</li>
              <li>סטטוס נוכחות יומי</li>
              <li>יום בשבוע לכל תאריך</li>
              <li>הערות (אם יש)</li>
              <li>סימון חגים ושבתות</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Export Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-2 glass rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold mb-4">טיפים לייצוא</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-light rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center mb-3">
              <span className="text-success text-lg">✓</span>
            </div>
            <h4 className="font-medium mb-1">פורמט Excel</h4>
            <p className="text-sm text-slate-400">הקבצים נשמרים בפורמט XLSX התומך בעברית ובכיוון RTL</p>
          </div>
          
          <div className="glass-light rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center mb-3">
              <span className="text-warning text-lg">📊</span>
            </div>
            <h4 className="font-medium mb-1">מקרא צבעים</h4>
            <p className="text-sm text-slate-400">הדוחות כוללים מקרא עם סימונים: ✓ נוכח, ✗ חיסור, א איחור, מ מוצדק</p>
          </div>
          
          <div className="glass-light rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center mb-3">
              <span className="text-primary-400 text-lg">📅</span>
            </div>
            <h4 className="font-medium mb-1">חגים ישראליים</h4>
            <p className="text-sm text-slate-400">ימי חג ושבתות מסומנים אוטומטית ולא נספרים כחיסורים</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
