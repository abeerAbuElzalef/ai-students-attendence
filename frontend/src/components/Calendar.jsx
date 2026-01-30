import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import { calendarApi } from '../api';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const HEBREW_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export default function Calendar({ onDateSelect, selectedDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    loadCalendarData();
  }, [year, month]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const response = await calendarApi.getMonth(year, month);
      setCalendarData(response.data);
    } catch (error) {
      console.error('Error loading calendar:', error);
    }
    setLoading(false);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    onDateSelect(todayStr);
  };

  // Calculate first day of month offset (for grid positioning)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const renderDay = (dayData) => {
    if (!dayData) return null;

    const isToday = dayData.date === todayStr;
    const isSelected = dayData.date === selectedDate;
    const isWeekend = dayData.dayOfWeek === 5 || dayData.dayOfWeek === 6;
    const isHoliday = !dayData.isSchoolDay && dayData.holiday;
    const isShabbat = dayData.dayOfWeek === 6;

    const attendanceRate = dayData.attendance.total > 0 && dayData.attendance.recorded > 0
      ? Math.round((dayData.attendance.present / dayData.attendance.total) * 100)
      : null;

    return (
      <motion.button
        key={dayData.date}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onDateSelect(dayData.date)}
        className={`
          calendar-day rounded-xl p-2 flex flex-col items-center justify-start gap-1
          transition-all duration-200 border
          ${isSelected 
            ? 'bg-gradient-to-br from-primary-600 to-primary-700 border-primary-500 shadow-lg shadow-primary-500/25' 
            : isShabbat
              ? 'glass-light border-slate-600/30'
              : isHoliday
                ? 'bg-holiday/20 border-holiday/30'
                : isWeekend
                  ? 'glass-light border-slate-600/30'
                  : 'glass border-slate-700/50 hover:border-slate-600/50'
          }
          ${isToday ? 'ring-2 ring-primary-400 ring-offset-2 ring-offset-slate-900' : ''}
        `}
      >
        {/* Day number */}
        <span className={`
          text-lg font-semibold
          ${isSelected ? 'text-white' : isShabbat || isHoliday ? 'text-slate-400' : 'text-slate-200'}
        `}>
          {dayData.day}
        </span>

        {/* Holiday indicator */}
        {isHoliday && (
          <span className="text-[10px] text-holiday font-medium truncate max-w-full px-1">
            {dayData.holiday?.hebrew_name || dayData.reason}
          </span>
        )}

        {/* Shabbat indicator */}
        {isShabbat && !isHoliday && (
          <span className="text-[10px] text-slate-500 font-medium">שבת</span>
        )}

        {/* Attendance indicator */}
        {dayData.isSchoolDay && dayData.attendance.recorded > 0 && (
          <div className="mt-auto w-full">
            <div className="flex items-center justify-center gap-0.5">
              <span className={`
                text-xs font-bold
                ${attendanceRate >= 90 ? 'text-success' : attendanceRate >= 70 ? 'text-warning' : 'text-error'}
              `}>
                {attendanceRate}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
              <div 
                className={`
                  h-full rounded-full transition-all duration-500
                  ${attendanceRate >= 90 ? 'bg-success' : attendanceRate >= 70 ? 'bg-warning' : 'bg-error'}
                `}
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
        )}

        {/* No attendance recorded indicator */}
        {dayData.isSchoolDay && dayData.attendance.recorded === 0 && !isSelected && (
          <span className="text-[10px] text-slate-500 mt-auto">לא דווח</span>
        )}
      </motion.button>
    );
  };

  return (
    <div className="glass rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <FiChevronRight size={24} />
          </button>
          
          <h2 className="text-2xl font-bold">
            {HEBREW_MONTHS[month - 1]} {year}
          </h2>
          
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <FiChevronLeft size={24} />
          </button>
        </div>

        <button
          onClick={goToToday}
          className="btn-secondary text-sm"
        >
          היום
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success"></div>
          <span>נוכחות גבוהה</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-warning"></div>
          <span>נוכחות בינונית</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-error"></div>
          <span>נוכחות נמוכה</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-holiday/50"></div>
          <span>חג</span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {HEBREW_DAYS.map((day, index) => (
          <div 
            key={day} 
            className={`
              dow-header text-center py-2
              ${index === 6 ? 'text-slate-500' : ''}
            `}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-10 h-10"></div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day" />
          ))}

          {/* Day cells */}
          {calendarData?.days.map(renderDay)}
        </div>
      )}

      {/* Month summary */}
      {calendarData && (
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">סה״כ תלמידים:</span>
            <span className="font-semibold">{calendarData.totalStudents}</span>
          </div>
        </div>
      )}
    </div>
  );
}
