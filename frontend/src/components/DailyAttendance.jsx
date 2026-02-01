import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiClock, FiAlertCircle, FiCalendar, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { attendanceApi } from '../api';

const STATUS_CONFIG = {
  present: { 
    label: 'נוכח', 
    icon: FiCheck, 
    color: 'bg-success', 
    hoverColor: 'hover:bg-success/80',
    textColor: 'text-success'
  },
  absent: { 
    label: 'חיסור', 
    icon: FiX, 
    color: 'bg-error', 
    hoverColor: 'hover:bg-error/80',
    textColor: 'text-error'
  },
  late: { 
    label: 'איחור', 
    icon: FiClock, 
    color: 'bg-warning', 
    hoverColor: 'hover:bg-warning/80',
    textColor: 'text-warning'
  },
  excused: { 
    label: 'מוצדק', 
    icon: FiAlertCircle, 
    color: 'bg-accent-500', 
    hoverColor: 'hover:bg-accent-600',
    textColor: 'text-accent-400'
  }
};

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function DailyAttendance({ classId, date, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (date && classId) {
      loadAttendance();
    }
  }, [date, classId]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const response = await attendanceApi.getByDate(date, classId);
      setData(response.data);
      
      // Initialize attendance state from loaded data
      const initialAttendance = {};
      response.data.students.forEach(student => {
        if (student.attendance) {
          initialAttendance[student._id] = student.attendance.status;
        }
      });
      setAttendance(initialAttendance);
      setHasChanges(false);
    } catch (error) {
      toast.error('שגיאה בטעינת הנתונים');
    }
    setLoading(false);
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status
    }));
    setHasChanges(true);
  };

  const handleMarkAll = (status) => {
    const newAttendance = {};
    data.students.forEach(student => {
      newAttendance[student._id] = status;
    });
    setAttendance(newAttendance);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance)
        .filter(([_, status]) => status !== null)
        .map(([studentId, status]) => ({
          studentId,
          classId,
          date,
          status
        }));

      await attendanceApi.bulkMark(records);
      toast.success('הנוכחות נשמרה בהצלחה');
      setHasChanges(false);
    } catch (error) {
      toast.error('שגיאה בשמירת הנוכחות');
    }
    setSaving(false);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const dayOfWeek = HEBREW_DAYS[d.getDay()];
    return `יום ${dayOfWeek}, ${day}/${month}/${year}`;
  };

  if (!date) {
    return (
      <div className="glass rounded-2xl p-6 h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <FiCalendar size={48} className="mb-4 opacity-50" />
        <p className="text-center">בחר תאריך מהלוח שנה<br />כדי לסמן נוכחות</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">נוכחות יומית</h3>
          <p className="text-sm text-slate-400">{formatDate(date)}</p>
        </div>
        
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <div className="spinner w-4 h-4"></div>
            ) : (
              <FiSave size={18} />
            )}
            <span>שמור</span>
          </button>
        )}
      </div>

      {/* Not a school day notice */}
      {data && !data.schoolDayInfo.isSchoolDay && (
        <div className="bg-holiday/20 border border-holiday/30 rounded-xl p-4 mb-6">
          <p className="text-holiday font-medium">{data.schoolDayInfo.reason}</p>
          <p className="text-sm text-slate-400 mt-1">לא יום לימודים</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-10 h-10"></div>
        </div>
      ) : data && data.students.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p>אין תלמידים בכיתה זו</p>
          <p className="text-sm mt-2">הוסף תלמידים בלשונית "תלמידים"</p>
        </div>
      ) : data && (
        <>
          {/* Quick actions */}
          {data.schoolDayInfo.isSchoolDay && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleMarkAll('present')}
                className="flex-1 py-2 px-3 rounded-lg bg-success/20 text-success text-sm font-medium hover:bg-success/30 transition-colors"
              >
                סמן הכל נוכחים
              </button>
              <button
                onClick={() => handleMarkAll('absent')}
                className="flex-1 py-2 px-3 rounded-lg bg-error/20 text-error text-sm font-medium hover:bg-error/30 transition-colors"
              >
                סמן הכל חסרים
              </button>
            </div>
          )}

          {/* Student list */}
          <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
            <AnimatePresence>
              {data.students.map((student, index) => (
                <motion.div
                  key={student._id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="glass-light rounded-xl p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{student.name}</p>
                    </div>
                    
                    {/* Status buttons */}
                    <div className="flex gap-1">
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                        const Icon = config.icon;
                        const isSelected = attendance[student._id] === status;
                        
                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(student._id, status)}
                            className={`
                              p-2 rounded-lg transition-all duration-200
                              ${isSelected 
                                ? `${config.color} text-white shadow-lg` 
                                : `bg-slate-700/50 text-slate-400 ${config.hoverColor}`
                              }
                            `}
                            title={config.label}
                          >
                            <Icon size={16} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Status label */}
                  {attendance[student._id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 pt-2 border-t border-slate-600/30"
                    >
                      <span className={`text-sm ${STATUS_CONFIG[attendance[student._id]].textColor}`}>
                        {STATUS_CONFIG[attendance[student._id]].label}
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <div className="grid grid-cols-4 gap-2 text-center">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                const count = Object.values(attendance).filter(s => s === status).length;
                return (
                  <div key={status} className="glass-light rounded-lg p-2">
                    <p className={`text-lg font-bold ${config.textColor}`}>{count}</p>
                    <p className="text-xs text-slate-400">{config.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
