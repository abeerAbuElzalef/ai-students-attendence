import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiUsers, FiCalendar, FiCheck, FiX } from 'react-icons/fi';
import { studentApi, calendarApi } from '../api';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function Statistics({ classId, className }) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [selectedMonth, selectedYear, classId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsRes, calendarRes] = await Promise.all([
        studentApi.getAll(classId),
        calendarApi.getMonth(selectedYear, selectedMonth, classId)
      ]);

      setStudents(studentsRes.data);
      setCalendarData(calendarRes.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
    setLoading(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Calculate statistics from calendar data
  const calculateStats = () => {
    if (!calendarData || !calendarData.days) return null;

    let totalPresent = 0;
    let totalPossible = 0;
    let schoolDays = 0;
    let recordedDays = 0;

    calendarData.days.forEach(day => {
      // Skip weekends (Friday=5, Saturday=6)
      if (day.isWeekend) return;
      // Skip holidays
      if (day.holiday) return;

      schoolDays++;
      
      if (day.attendance && day.attendance.total > 0) {
        recordedDays++;
        totalPresent += day.attendance.present;
        totalPossible += day.attendance.total;
      }
    });

    const attendanceRate = totalPossible > 0 
      ? Math.round((totalPresent / totalPossible) * 100) 
      : 0;

    const totalAbsent = totalPossible - totalPresent;

    return {
      totalPresent,
      totalAbsent,
      totalPossible,
      attendanceRate,
      schoolDays,
      recordedDays
    };
  };

  const stats = calculateStats();

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
              <p className="text-slate-400 text-sm">{className}</p>
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
              <p className="text-xs text-slate-500 mt-1">בכיתה</p>
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
                (stats?.attendanceRate || 0) >= 90 ? 'text-success' :
                (stats?.attendanceRate || 0) >= 70 ? 'text-warning' : 'text-error'
              }`}>
                {stats?.attendanceRate || 0}%
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
              <p className="text-3xl font-bold">{stats?.schoolDays || 0}</p>
              <p className="text-xs text-slate-500 mt-1">{stats?.recordedDays || 0} דווחו</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
                  <FiX size={20} className="text-error" />
                </div>
                <span className="text-slate-400 text-sm">חיסורים</span>
              </div>
              <p className="text-3xl font-bold text-error">{stats?.totalAbsent || 0}</p>
              <p className="text-xs text-slate-500 mt-1">סה״כ בחודש</p>
            </motion.div>
          </div>

          {/* Attendance Breakdown */}
          {stats && stats.totalPossible > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold mb-6">פילוח נוכחות חודשי</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                  <div className="w-full h-40 bg-slate-800/50 rounded-xl flex items-end justify-center p-3">
                    <div 
                      className="w-full bg-gradient-to-t from-success to-success/70 rounded-t-lg transition-all duration-500"
                      style={{ height: `${(stats.totalPresent / stats.totalPossible) * 100}%` }}
                    />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-success">{stats.totalPresent}</p>
                  <p className="text-sm text-slate-400">נוכחים</p>
                </div>
                
                <div className="text-center">
                  <div className="w-full h-40 bg-slate-800/50 rounded-xl flex items-end justify-center p-3">
                    <div 
                      className="w-full bg-gradient-to-t from-error to-error/70 rounded-t-lg transition-all duration-500"
                      style={{ height: `${(stats.totalAbsent / stats.totalPossible) * 100}%` }}
                    />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-error">{stats.totalAbsent}</p>
                  <p className="text-sm text-slate-400">חסרים</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">אחוז נוכחות כולל</span>
                  <span className={`font-bold ${
                    stats.attendanceRate >= 90 ? 'text-success' :
                    stats.attendanceRate >= 70 ? 'text-warning' : 'text-error'
                  }`}>{stats.attendanceRate}%</span>
                </div>
                <div className="h-4 bg-slate-800/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      stats.attendanceRate >= 90 ? 'bg-success' :
                      stats.attendanceRate >= 70 ? 'bg-warning' : 'bg-error'
                    }`}
                    style={{ width: `${stats.attendanceRate}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mt-4">
                <span>סה״כ רשומות:</span>
                <span className="font-bold text-white">{stats.totalPossible}</span>
              </div>
            </motion.div>
          )}

          {/* No data message */}
          {(!stats || stats.totalPossible === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-12 text-center"
            >
              <FiCalendar size={48} className="mx-auto mb-4 text-slate-500" />
              <h3 className="text-lg font-bold mb-2">אין נתונים להצגה</h3>
              <p className="text-slate-400">סמן נוכחות בלוח השנה כדי לראות סטטיסטיקות</p>
            </motion.div>
          )}

          {/* Calendar heatmap preview */}
          {calendarData && calendarData.days && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold mb-4">מפת נוכחות חודשית</h3>
              <div className="grid grid-cols-7 gap-2">
                {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
                  <div key={day} className="text-center text-xs text-slate-500 font-medium py-1">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for alignment */}
                {Array.from({ length: calendarData.days[0]?.dayOfWeek || 0 }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {calendarData.days.map((day) => {
                  const isWeekend = day.isWeekend;
                  const hasHoliday = day.holiday;
                  const hasData = day.attendance && day.attendance.total > 0;
                  const percentage = hasData ? day.attendance.percentage : 0;
                  
                  let bgColor = 'bg-slate-800/30';
                  if (isWeekend || hasHoliday) {
                    bgColor = 'bg-slate-700/20';
                  } else if (hasData) {
                    if (percentage >= 90) bgColor = 'bg-success/60';
                    else if (percentage >= 70) bgColor = 'bg-warning/60';
                    else if (percentage > 0) bgColor = 'bg-error/60';
                  }

                  return (
                    <div
                      key={day.day}
                      className={`aspect-square rounded-lg ${bgColor} flex items-center justify-center text-xs font-medium transition-colors`}
                      title={`${day.day}/${selectedMonth} - ${hasData ? `${percentage}% נוכחות` : hasHoliday ? day.holiday.hebrewName : isWeekend ? 'סוף שבוע' : 'לא דווח'}`}
                    >
                      {day.day}
                    </div>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-success/60"></div>
                  <span className="text-slate-400">90%+</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-warning/60"></div>
                  <span className="text-slate-400">70-89%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-error/60"></div>
                  <span className="text-slate-400">&lt;70%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-slate-800/30"></div>
                  <span className="text-slate-400">לא דווח</span>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
