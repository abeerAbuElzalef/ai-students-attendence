import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiUsers, FiCalendar, FiAward } from 'react-icons/fi';
import { attendanceApi, studentApi, calendarApi } from '../api';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function Statistics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

      const [statsRes, studentsRes, calendarRes] = await Promise.all([
        attendanceApi.getStats(startDate, endDate),
        studentApi.getAll(),
        calendarApi.getMonth(selectedYear, selectedMonth)
      ]);

      setStats(statsRes.data);
      setStudents(studentsRes.data);
      setCalendarData(calendarRes.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
    setLoading(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Calculate overall statistics
  const calculateOverallStats = () => {
    if (!stats || stats.length === 0) return null;

    const totals = stats.reduce((acc, student) => ({
      present: acc.present + student.present_count,
      absent: acc.absent + student.absent_count,
      late: acc.late + student.late_count,
      excused: acc.excused + student.excused_count,
      total: acc.total + student.total_records
    }), { present: 0, absent: 0, late: 0, excused: 0, total: 0 });

    const attendanceRate = totals.total > 0 
      ? Math.round((totals.present / totals.total) * 100) 
      : 0;

    return { ...totals, attendanceRate };
  };

  // Get top performers
  const getTopPerformers = () => {
    if (!stats || stats.length === 0) return [];

    return [...stats]
      .map(s => ({
        ...s,
        rate: s.total_records > 0 ? Math.round((s.present_count / s.total_records) * 100) : 0
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
  };

  // Get students with attendance issues
  const getAttendanceIssues = () => {
    if (!stats || stats.length === 0) return [];

    return [...stats]
      .map(s => ({
        ...s,
        rate: s.total_records > 0 ? Math.round((s.present_count / s.total_records) * 100) : 100
      }))
      .filter(s => s.rate < 80 && s.total_records > 0)
      .sort((a, b) => a.rate - b.rate);
  };

  const overall = calculateOverallStats();
  const topPerformers = getTopPerformers();
  const attendanceIssues = getAttendanceIssues();

  // Count school days
  const schoolDays = calendarData?.days.filter(d => d.isSchoolDay).length || 0;
  const recordedDays = calendarData?.days.filter(d => d.isSchoolDay && d.attendance.recorded > 0).length || 0;

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <FiTrendingUp size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">סטטיסטיקות נוכחות</h2>
              <p className="text-slate-400 text-sm">ניתוח נתוני נוכחות לפי חודש</p>
            </div>
          </div>

          <div className="flex gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="input-field w-36"
            >
              {HEBREW_MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="input-field w-28"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-10 h-10"></div>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <FiUsers size={20} className="text-primary-400" />
                </div>
                <span className="text-slate-400 text-sm">תלמידים</span>
              </div>
              <p className="text-3xl font-bold">{students.length}</p>
              <p className="text-xs text-slate-500 mt-1">רשומים במערכת</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <FiTrendingUp size={20} className="text-success" />
                </div>
                <span className="text-slate-400 text-sm">אחוז נוכחות</span>
              </div>
              <p className={`text-3xl font-bold ${
                overall?.attendanceRate >= 90 ? 'text-success' :
                overall?.attendanceRate >= 70 ? 'text-warning' : 'text-error'
              }`}>
                {overall?.attendanceRate || 0}%
              </p>
              <p className="text-xs text-slate-500 mt-1">ממוצע חודשי</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                  <FiCalendar size={20} className="text-accent-400" />
                </div>
                <span className="text-slate-400 text-sm">ימי לימוד</span>
              </div>
              <p className="text-3xl font-bold">{schoolDays}</p>
              <p className="text-xs text-slate-500 mt-1">{recordedDays} דווחו</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
                  <span className="text-error text-lg">✗</span>
                </div>
                <span className="text-slate-400 text-sm">חיסורים</span>
              </div>
              <p className="text-3xl font-bold text-error">{overall?.absent || 0}</p>
              <p className="text-xs text-slate-500 mt-1">סה״כ בחודש</p>
            </motion.div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <FiAward size={24} className="text-warning" />
                <h3 className="text-lg font-bold">נוכחות מצוינת</h3>
              </div>

              {topPerformers.length === 0 ? (
                <p className="text-slate-400 text-center py-8">אין נתונים להצגה</p>
              ) : (
                <div className="space-y-3">
                  {topPerformers.map((student, index) => (
                    <div key={student.student_id} className="glass-light rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                            ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                              index === 1 ? 'bg-slate-400/20 text-slate-300' :
                              index === 2 ? 'bg-amber-700/20 text-amber-600' :
                              'bg-slate-600/30 text-slate-400'}
                          `}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{student.student_name}</p>
                            {student.class_name && (
                              <p className="text-xs text-slate-400">{student.class_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-left">
                          <p className={`font-bold ${
                            student.rate >= 90 ? 'text-success' : 'text-warning'
                          }`}>
                            {student.rate}%
                          </p>
                          <p className="text-xs text-slate-400">
                            {student.present_count}/{student.total_records}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Attendance Issues */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-lg font-bold">דורשים תשומת לב</h3>
              </div>

              {attendanceIssues.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-success font-medium">מצוין!</p>
                  <p className="text-slate-400 text-sm mt-1">אין תלמידים עם בעיות נוכחות</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendanceIssues.map((student) => (
                    <div key={student.student_id} className="glass-light rounded-xl p-3 border border-error/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{student.student_name}</p>
                          {student.class_name && (
                            <p className="text-xs text-slate-400">{student.class_name}</p>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-error">{student.rate}%</p>
                          <p className="text-xs text-slate-400">
                            {student.absent_count} חיסורים
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-error rounded-full"
                          style={{ width: `${student.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Monthly Breakdown */}
          {overall && overall.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold mb-6">פילוח נוכחות חודשי</h3>
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="w-full h-32 bg-slate-800/50 rounded-xl flex items-end justify-center p-2">
                    <div 
                      className="w-full bg-gradient-to-t from-success to-success/70 rounded-t-lg transition-all duration-500"
                      style={{ height: `${(overall.present / overall.total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 font-bold text-success">{overall.present}</p>
                  <p className="text-sm text-slate-400">נוכחים</p>
                </div>
                
                <div className="text-center">
                  <div className="w-full h-32 bg-slate-800/50 rounded-xl flex items-end justify-center p-2">
                    <div 
                      className="w-full bg-gradient-to-t from-error to-error/70 rounded-t-lg transition-all duration-500"
                      style={{ height: `${(overall.absent / overall.total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 font-bold text-error">{overall.absent}</p>
                  <p className="text-sm text-slate-400">חיסורים</p>
                </div>
                
                <div className="text-center">
                  <div className="w-full h-32 bg-slate-800/50 rounded-xl flex items-end justify-center p-2">
                    <div 
                      className="w-full bg-gradient-to-t from-warning to-warning/70 rounded-t-lg transition-all duration-500"
                      style={{ height: `${(overall.late / overall.total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 font-bold text-warning">{overall.late}</p>
                  <p className="text-sm text-slate-400">איחורים</p>
                </div>
                
                <div className="text-center">
                  <div className="w-full h-32 bg-slate-800/50 rounded-xl flex items-end justify-center p-2">
                    <div 
                      className="w-full bg-gradient-to-t from-accent-500 to-accent-500/70 rounded-t-lg transition-all duration-500"
                      style={{ height: `${(overall.excused / overall.total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 font-bold text-accent-400">{overall.excused}</p>
                  <p className="text-sm text-slate-400">מוצדקים</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <span>סה״כ רשומות:</span>
                <span className="font-bold text-white">{overall.total}</span>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
