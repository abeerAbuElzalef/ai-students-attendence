import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiFolder, FiActivity, FiTrash2, FiAlertTriangle,
  FiUser, FiDatabase, FiShield, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminApi } from '../api';
import { useAuth } from '../context/AuthContext';

const ITEMS_PER_PAGE = 20;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [teachersPagination, setTeachersPagination] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classesPagination, setClassesPagination] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Sorting and pagination state
  const [teacherSortBy, setTeacherSortBy] = useState('firstName');
  const [teacherPage, setTeacherPage] = useState(1);
  const [classPage, setClassPage] = useState(1);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === 'teachers') {
      loadTeachers();
    }
  }, [activeTab, teacherSortBy, teacherPage]);

  useEffect(() => {
    if (activeTab === 'classes') {
      loadClasses();
    }
  }, [activeTab, classPage]);

  const loadDashboard = async () => {
    try {
      const dashboardRes = await adminApi.getDashboard();
      setDashboard(dashboardRes.data);
    } catch (error) {
      toast.error('שגיאה בטעינת הנתונים');
    }
    setLoading(false);
  };

  const loadTeachers = async () => {
    try {
      const res = await adminApi.getTeachers(teacherPage, ITEMS_PER_PAGE, teacherSortBy);
      setTeachers(res.data.teachers || []);
      setTeachersPagination(res.data.pagination);
    } catch (error) {
      toast.error('שגיאה בטעינת רשימת המורים');
    }
  };

  const loadClasses = async () => {
    try {
      const res = await adminApi.getClasses(classPage, ITEMS_PER_PAGE);
      setClasses(res.data.classes || []);
      setClassesPagination(res.data.pagination);
    } catch (error) {
      toast.error('שגיאה בטעינת רשימת הכיתות');
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    const fullName = `${teacher.firstName} ${teacher.lastName}`;
    try {
      await adminApi.deleteTeacher(teacher._id);
      toast.success(`המורה ${fullName} נמחק בהצלחה`);
      setDeleteConfirm(null);
      loadDashboard();
      loadTeachers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה במחיקה');
    }
  };

  const handleDeleteClass = async (cls) => {
    try {
      await adminApi.deleteClass(cls._id);
      toast.success(`הכיתה ${cls.name} נמחקה בהצלחה`);
      setDeleteConfirm(null);
      loadDashboard();
      loadClasses();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה במחיקה');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'לא התחבר';
    return new Date(date).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTeacherFullName = (teacher) => {
    return `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
  };

  // Pagination component
  const Pagination = ({ pagination, onPageChange, label }) => {
    if (!pagination || pagination.totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
        <div className="text-sm text-slate-400">
          מציג {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-
          {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} מתוך {pagination.totalItems} {label}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className={`p-2 rounded-lg transition-colors ${
              pagination.hasPrevPage 
                ? 'hover:bg-slate-700/50 text-slate-300' 
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <FiChevronRight size={20} />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.currentPage <= 3) {
                pageNum = i + 1;
              } else if (pagination.currentPage >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    pageNum === pagination.currentPage
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-slate-700/50 text-slate-400'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className={`p-2 rounded-lg transition-colors ${
              pagination.hasNextPage 
                ? 'hover:bg-slate-700/50 text-slate-300' 
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <FiChevronLeft size={20} />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-10 h-10"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <FiActivity size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">לוח בקרה - מנהל</h1>
            <p className="text-slate-400">ניהול מערכת הנוכחות</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FiUser size={20} className="text-blue-400" />
            </div>
            <span className="text-slate-400 text-sm">מורים</span>
          </div>
          <p className="text-3xl font-bold">{dashboard?.stats.totalTeachers || 0}</p>
          <p className="text-xs text-slate-500 mt-1">רשומים במערכת</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FiFolder size={20} className="text-green-400" />
            </div>
            <span className="text-slate-400 text-sm">כיתות</span>
          </div>
          <p className="text-3xl font-bold">{dashboard?.stats.totalClasses || 0}</p>
          <p className="text-xs text-slate-500 mt-1">סה״כ במערכת</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FiUsers size={20} className="text-purple-400" />
            </div>
            <span className="text-slate-400 text-sm">תלמידים</span>
          </div>
          <p className="text-3xl font-bold">{dashboard?.stats.totalStudents || 0}</p>
          <p className="text-xs text-slate-500 mt-1">פעילים</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <FiDatabase size={20} className="text-orange-400" />
            </div>
            <span className="text-slate-400 text-sm">רשומות</span>
          </div>
          <p className="text-3xl font-bold">{dashboard?.stats.totalAttendanceRecords || 0}</p>
          <p className="text-xs text-slate-500 mt-1">נוכחות</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'overview', label: 'סקירה כללית', icon: FiActivity },
          { id: 'teachers', label: 'מורים', icon: FiUser },
          { id: 'classes', label: 'כיתות', icon: FiFolder }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
              ${activeTab === tab.id 
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white' 
                : 'glass text-slate-400 hover:text-white'
              }
            `}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Recent Teachers */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiUser className="text-blue-400" />
                מורים אחרונים
              </h3>
              <div className="space-y-3">
                {dashboard?.recentTeachers.slice(0, 5).map(teacher => (
                  <div key={teacher._id} className="glass-light rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {(teacher.firstName?.charAt(0) || '') + (teacher.lastName?.charAt(0) || '')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{teacher.firstName} {teacher.lastName}</p>
                          <p className="text-xs text-slate-400">{teacher.email}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-slate-400">התחברות אחרונה</p>
                        <p className="text-xs">{formatDate(teacher.lastLogin)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!dashboard?.recentTeachers || dashboard.recentTeachers.length === 0) && (
                  <p className="text-slate-400 text-center py-4">אין מורים רשומים</p>
                )}
              </div>
            </div>

            {/* Recent Classes */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiFolder className="text-green-400" />
                כיתות אחרונות
              </h3>
              <div className="space-y-3">
                {dashboard?.recentClasses.slice(0, 5).map(cls => (
                  <div key={cls._id} className="glass-light rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{cls.name}</p>
                        <p className="text-xs text-slate-400">
                          {cls.teacher ? `${cls.teacher.firstName} ${cls.teacher.lastName}` : 'ללא מורה'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!dashboard?.recentClasses || dashboard.recentClasses.length === 0) && (
                  <p className="text-slate-400 text-center py-4">אין כיתות</p>
                )}
              </div>
            </div>

            {/* Classes per Teacher */}
            <div className="lg:col-span-2 glass rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiActivity className="text-orange-400" />
                כיתות לפי מורה
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dashboard?.classesPerTeacher.map(item => (
                  <div key={item._id} className="glass-light rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary-400">{item.classCount}</p>
                    <p className="text-sm font-medium mt-1">{item.teacherFirstName} {item.teacherLastName}</p>
                    <p className="text-xs text-slate-400">{item.teacherEmail}</p>
                  </div>
                ))}
                {(!dashboard?.classesPerTeacher || dashboard.classesPerTeacher.length === 0) && (
                  <p className="col-span-4 text-slate-400 text-center py-4">אין נתונים</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'teachers' && (
          <motion.div
            key="teachers"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-2xl overflow-hidden"
          >
            {/* Sort Options */}
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="font-bold">רשימת מורים</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">מיון:</span>
                <div className="flex rounded-xl overflow-hidden border border-slate-600">
                  <button
                    onClick={() => { setTeacherSortBy('firstName'); setTeacherPage(1); }}
                    className={`px-4 py-2 text-sm transition-colors ${
                      teacherSortBy === 'firstName'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    שם פרטי
                  </button>
                  <button
                    onClick={() => { setTeacherSortBy('lastName'); setTeacherPage(1); }}
                    className={`px-4 py-2 text-sm transition-colors ${
                      teacherSortBy === 'lastName'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    שם משפחה
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-700/50">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-800/50 text-sm font-semibold text-slate-400">
                <div className="col-span-1">#</div>
                <div className="col-span-3">שם מלא</div>
                <div className="col-span-3">אימייל</div>
                <div className="col-span-2">כיתות</div>
                <div className="col-span-2">התחברות אחרונה</div>
                <div className="col-span-1">פעולות</div>
              </div>
              
              {teachers.map((teacher, index) => {
                const isCurrentUser = user && (user._id === teacher._id || user.email === teacher.email);
                const fullName = getTeacherFullName(teacher);
                const rowNum = ((teachersPagination?.currentPage || 1) - 1) * ITEMS_PER_PAGE + index + 1;
                
                return (
                  <div key={teacher._id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors">
                    <div className="col-span-1 text-slate-500">{rowNum}</div>
                    <div className="col-span-3 font-medium flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                          {(teacher.firstName?.charAt(0) || '') + (teacher.lastName?.charAt(0) || '')}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate">{fullName}</p>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-xs">אתה</span>
                        )}
                      </div>
                      {teacher.role === 'admin' && (
                        <FiShield size={14} className="text-warning flex-shrink-0" title="מנהל" />
                      )}
                    </div>
                    <div className="col-span-3 text-slate-400 text-sm truncate">{teacher.email}</div>
                    <div className="col-span-2">
                      <span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-sm">
                        {teacher.classCount} כיתות
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-slate-400">
                      {formatDate(teacher.lastLogin)}
                    </div>
                    <div className="col-span-1">
                      {isCurrentUser ? (
                        <span className="text-xs text-slate-500">—</span>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm({ type: 'teacher', item: teacher })}
                          className="p-2 rounded-lg hover:bg-error/20 text-slate-400 hover:text-error transition-colors"
                          title="מחק מורה"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {teachers.length === 0 && (
                <div className="px-6 py-12 text-center text-slate-400">
                  <FiUser size={48} className="mx-auto mb-4 opacity-50" />
                  <p>אין מורים רשומים</p>
                </div>
              )}
            </div>

            <Pagination 
              pagination={teachersPagination} 
              onPageChange={setTeacherPage}
              label="מורים"
            />
          </motion.div>
        )}

        {activeTab === 'classes' && (
          <motion.div
            key="classes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h3 className="font-bold">רשימת כיתות</h3>
            </div>

            <div className="divide-y divide-slate-700/50">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-800/50 text-sm font-semibold text-slate-400">
                <div className="col-span-1">#</div>
                <div className="col-span-3">שם הכיתה</div>
                <div className="col-span-3">מורה</div>
                <div className="col-span-2">תלמידים</div>
                <div className="col-span-2">תאריך יצירה</div>
                <div className="col-span-1">פעולות</div>
              </div>
              
              {classes.map((cls, index) => {
                const rowNum = ((classesPagination?.currentPage || 1) - 1) * ITEMS_PER_PAGE + index + 1;
                const teacherName = cls.teacher 
                  ? `${cls.teacher.firstName || ''} ${cls.teacher.lastName || ''}`.trim() 
                  : 'ללא מורה';
                
                return (
                  <div key={cls._id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors">
                    <div className="col-span-1 text-slate-500">{rowNum}</div>
                    <div className="col-span-3 font-medium">{cls.name}</div>
                    <div className="col-span-3 text-slate-400 text-sm">{teacherName}</div>
                    <div className="col-span-2">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">
                        {cls.studentCount} תלמידים
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-slate-400">
                      {formatDate(cls.createdAt)}
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => setDeleteConfirm({ type: 'class', item: cls })}
                        className="p-2 rounded-lg hover:bg-error/20 text-slate-400 hover:text-error transition-colors"
                        title="מחק כיתה"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {classes.length === 0 && (
                <div className="px-6 py-12 text-center text-slate-400">
                  <FiFolder size={48} className="mx-auto mb-4 opacity-50" />
                  <p>אין כיתות במערכת</p>
                </div>
              )}
            </div>

            <Pagination 
              pagination={classesPagination} 
              onPageChange={setClassPage}
              label="כיתות"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-4">
                  <FiAlertTriangle size={32} className="text-error" />
                </div>
                
                <h3 className="text-xl font-bold mb-2">אישור מחיקה</h3>
                
                {deleteConfirm.type === 'teacher' ? (
                  <p className="text-slate-400 mb-6">
                    האם אתה בטוח שברצונך למחוק את המורה <strong>{getTeacherFullName(deleteConfirm.item)}</strong>?
                    <br />
                    <span className="text-error text-sm">
                      פעולה זו תמחק גם את כל הכיתות, התלמידים והנתונים של המורה!
                    </span>
                  </p>
                ) : (
                  <p className="text-slate-400 mb-6">
                    האם אתה בטוח שברצונך למחוק את הכיתה <strong>{deleteConfirm.item.name}</strong>?
                    <br />
                    <span className="text-error text-sm">
                      פעולה זו תמחק גם את כל התלמידים ונתוני הנוכחות של הכיתה!
                    </span>
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirm.type === 'teacher') {
                        handleDeleteTeacher(deleteConfirm.item);
                      } else {
                        handleDeleteClass(deleteConfirm.item);
                      }
                    }}
                    className="flex-1 py-3 rounded-xl bg-error hover:bg-error/80 text-white font-medium transition-colors"
                  >
                    מחק
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
