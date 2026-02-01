import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiCalendar, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { attendanceApi } from '../api';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function DailyAttendance({ classId, date, onClose }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState({});
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
      const studentsData = response.data;
      setStudents(studentsData);
      
      // Initialize attendance state from loaded data
      const initialAttendance = {};
      studentsData.forEach(student => {
        initialAttendance[student._id] = student.present;
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('שגיאה בטעינת הנתונים');
    }
    setLoading(false);
  };

  const handleToggleAttendance = async (studentId) => {
    const newPresent = !attendance[studentId];
    
    // Update local state immediately
    setAttendance(prev => ({
      ...prev,
      [studentId]: newPresent
    }));

    // Save to server
    try {
      await attendanceApi.mark(studentId, date, newPresent, classId);
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('שגיאה בשמירת הנוכחות');
      // Revert on error
      setAttendance(prev => ({
        ...prev,
        [studentId]: !newPresent
      }));
    }
  };

  const handleMarkAll = async (present) => {
    setSaving(true);
    
    // Update local state
    const newAttendance = {};
    students.forEach(student => {
      newAttendance[student._id] = present;
    });
    setAttendance(newAttendance);

    // Save all to server
    try {
      for (const student of students) {
        await attendanceApi.mark(student._id, date, present, classId);
      }
      toast.success(present ? 'כל התלמידים סומנו כנוכחים' : 'כל התלמידים סומנו כחסרים');
    } catch (error) {
      console.error('Error marking all:', error);
      toast.error('שגיאה בשמירת הנוכחות');
      loadAttendance(); // Reload to get correct state
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

  const presentCount = Object.values(attendance).filter(v => v === true).length;
  const absentCount = Object.values(attendance).filter(v => v === false).length;

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
      <div className="mb-6">
        <h3 className="text-lg font-bold">נוכחות יומית</h3>
        <p className="text-sm text-slate-400">{formatDate(date)}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-10 h-10"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p>אין תלמידים בכיתה זו</p>
          <p className="text-sm mt-2">הוסף תלמידים בלשונית "תלמידים"</p>
        </div>
      ) : (
        <>
          {/* Quick actions */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => handleMarkAll(true)}
              disabled={saving}
              className="flex-1 py-2 px-3 rounded-lg bg-success/20 text-success text-sm font-medium hover:bg-success/30 transition-colors disabled:opacity-50"
            >
              {saving ? '...' : 'סמן הכל נוכחים'}
            </button>
            <button
              onClick={() => handleMarkAll(false)}
              disabled={saving}
              className="flex-1 py-2 px-3 rounded-lg bg-error/20 text-error text-sm font-medium hover:bg-error/30 transition-colors disabled:opacity-50"
            >
              {saving ? '...' : 'סמן הכל חסרים'}
            </button>
          </div>

          {/* Student list */}
          <div className="space-y-2 max-h-[calc(100vh-450px)] overflow-y-auto">
            <AnimatePresence>
              {students.map((student, index) => {
                const isPresent = attendance[student._id];
                
                return (
                  <motion.div
                    key={student._id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="glass-light rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-sm w-6">{index + 1}</span>
                        <p className="font-medium">{student.firstName} {student.lastName}</p>
                      </div>
                      
                      {/* Toggle buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleAttendance(student._id)}
                          className={`
                            p-2.5 rounded-lg transition-all duration-200 flex items-center gap-2
                            ${isPresent 
                              ? 'bg-success text-white shadow-lg shadow-success/25' 
                              : 'bg-error text-white shadow-lg shadow-error/25'
                            }
                          `}
                        >
                          {isPresent ? (
                            <>
                              <FiCheck size={18} />
                              <span className="text-sm font-medium">נוכח</span>
                            </>
                          ) : (
                            <>
                              <FiX size={18} />
                              <span className="text-sm font-medium">חסר</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="glass-light rounded-lg p-3">
                <p className="text-2xl font-bold text-success">{presentCount}</p>
                <p className="text-sm text-slate-400">נוכחים</p>
              </div>
              <div className="glass-light rounded-lg p-3">
                <p className="text-2xl font-bold text-error">{absentCount}</p>
                <p className="text-sm text-slate-400">חסרים</p>
              </div>
            </div>
            
            {students.length > 0 && (
              <div className="mt-3 text-center">
                <p className="text-sm text-slate-400">
                  אחוז נוכחות: {Math.round((presentCount / students.length) * 100)}%
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
