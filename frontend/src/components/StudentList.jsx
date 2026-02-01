import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiUpload, FiX, FiCheck, FiDownload, FiFile, FiSearch, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { studentApi } from '../api';

// Generate a consistent color based on name
const getAvatarColor = (name) => {
  const colors = [
    'from-rose-500 to-pink-600',
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-fuchsia-500 to-pink-600',
    'from-indigo-500 to-blue-600',
    'from-lime-500 to-green-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Get initials from first and last name
const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return `${first}${last}`;
};

export default function StudentList({ classId, className, classes, onStudentChange }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '' });
  const [bulkText, setBulkText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('firstName');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewStudents, setPreviewStudents] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (classId) {
      loadStudents();
    }
  }, [classId]);

  const sortStudents = (studentList, sortType) => {
    return [...studentList].sort((a, b) => {
      if (sortType === 'lastName') {
        const result = a.lastName.localeCompare(b.lastName, 'he');
        if (result !== 0) return result;
        return a.firstName.localeCompare(b.firstName, 'he');
      }
      const result = a.firstName.localeCompare(b.firstName, 'he');
      if (result !== 0) return result;
      return a.lastName.localeCompare(b.lastName, 'he');
    });
  };

  const loadStudents = async () => {
    try {
      const response = await studentApi.getAll(classId);
      const sortedStudents = sortStudents(response.data, sortBy);
      setStudents(sortedStudents);
      onStudentChange?.(sortedStudents.length);
    } catch (error) {
      toast.error('שגיאה בטעינת התלמידים');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (students.length > 0) {
      setStudents(sortStudents(students, sortBy));
    }
  }, [sortBy]);

  const handleAddStudent = async () => {
    if (!newStudent.firstName.trim() || !newStudent.lastName.trim()) {
      toast.error('נא להזין שם פרטי ושם משפחה');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      await studentApi.create(newStudent.firstName.trim(), newStudent.lastName.trim(), classId);
      toast.success('התלמיד נוסף בהצלחה');
      setShowAddModal(false);
      setNewStudent({ firstName: '', lastName: '' });
      loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה בהוספת התלמיד');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAdd = async () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      toast.error('נא להזין שמות תלמידים');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    const studentsToAdd = lines.map(line => {
      const parts = line.includes(',') 
        ? line.split(',').map(p => p.trim())
        : line.trim().split(/\s+/);
      
      if (parts.length >= 2) {
        return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
      }
      return { firstName: parts[0], lastName: '' };
    }).filter(s => s.firstName && s.lastName);

    if (studentsToAdd.length === 0) {
      toast.error('נא להזין שם פרטי ושם משפחה לכל תלמיד');
      setSubmitting(false);
      return;
    }

    try {
      const response = await studentApi.import(classId, studentsToAdd);
      toast.success(response.data.message);
      setShowBulkModal(false);
      setBulkText('');
      loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה בהוספת התלמידים');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const extractedStudents = jsonData.map(row => {
          const firstName = row['שם פרטי'] || row['firstName'] || row['First Name'] || '';
          const lastName = row['שם משפחה'] || row['lastName'] || row['Last Name'] || '';
          return { 
            firstName: String(firstName).trim(), 
            lastName: String(lastName).trim() 
          };
        }).filter(s => s.firstName && s.lastName);

        setPreviewStudents(extractedStudents);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error('שגיאה בקריאת הקובץ');
        setImportFile(null);
        setPreviewStudents([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportExcel = async () => {
    if (previewStudents.length === 0) {
      toast.error('לא נמצאו תלמידים בקובץ');
      return;
    }

    setImporting(true);

    try {
      const response = await studentApi.import(classId, previewStudents);
      toast.success(response.data.message || `${previewStudents.length} תלמידים יובאו בהצלחה`);
      setShowImportModal(false);
      setImportFile(null);
      setPreviewStudents([]);
      loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה בייבוא הקובץ');
    }
    setImporting(false);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent.firstName.trim() || !editingStudent.lastName.trim()) {
      toast.error('נא להזין שם פרטי ושם משפחה');
      return;
    }

    try {
      await studentApi.update(editingStudent._id, {
        firstName: editingStudent.firstName,
        lastName: editingStudent.lastName
      });
      toast.success('התלמיד עודכן בהצלחה');
      setEditingStudent(null);
      loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה בעדכון התלמיד');
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${name}?`)) {
      return;
    }

    try {
      await studentApi.delete(id);
      toast.success('התלמיד נמחק בהצלחה');
      loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה במחיקת התלמיד');
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { 'שם פרטי': 'ישראל', 'שם משפחה': 'ישראלי' },
      { 'שם פרטי': 'שרה', 'שם משפחה': 'כהן' },
      { 'שם פרטי': 'דוד', 'שם משפחה': 'לוי' }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students_template.xlsx');
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`;
    return fullName.includes(searchTerm) || 
           student.firstName.includes(searchTerm) || 
           student.lastName.includes(searchTerm);
  });

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="glass rounded-2xl p-6 border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/25">
                <FiUsers size={28} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                <span className="text-xs font-bold text-accent-400">{students.length}</span>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                רשימת תלמידים
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {className} • {students.length} תלמידים רשומים
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-slate-300 hover:bg-slate-700/80 hover:text-white hover:border-slate-500 transition-all duration-200 text-sm font-medium"
            >
              <FiFile size={16} />
              <span>ייבוא</span>
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-600/50 text-slate-300 hover:bg-slate-700/80 hover:text-white hover:border-slate-500 transition-all duration-200 text-sm font-medium"
            >
              <FiUpload size={16} />
              <span>הוספה מרובה</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all duration-200 text-sm"
            >
              <FiPlus size={16} />
              <span>הוסף תלמיד</span>
            </button>
          </div>
        </div>

        {/* Search and Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="חיפוש לפי שם..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-10 py-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <FiX size={16} />
              </button>
            )}
          </div>

          {/* Sort Toggle */}
          <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-1.5 border border-slate-600/50">
            <span className="text-xs text-slate-500 px-2 hidden sm:block">מיון:</span>
            <button
              onClick={() => setSortBy('firstName')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                sortBy === 'firstName'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              שם פרטי
            </button>
            <button
              onClick={() => setSortBy('lastName')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                sortBy === 'lastName'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              שם משפחה
            </button>
          </div>
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="glass rounded-2xl overflow-hidden border border-slate-700/50">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner w-10 h-10"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <FiUsers size={40} className="text-slate-600" />
            </div>
            <p className="text-slate-400 text-lg">אין תלמידים להצגה</p>
            <p className="text-sm text-slate-500 mt-2">לחץ על "הוסף תלמיד" כדי להתחיל</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gradient-to-r from-slate-800/80 to-slate-800/40 border-b border-slate-700/50">
              <div className="col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</div>
              <div className="col-span-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">תלמיד</div>
              <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:block">שם משפחה</div>
              <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">פעולות</div>
            </div>

            {/* Student Rows */}
            <div className="divide-y divide-slate-700/30">
              <AnimatePresence>
                {filteredStudents.map((student, index) => (
                  <motion.div
                    key={student._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.02 }}
                    className="group grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-800/30 transition-all duration-200"
                  >
                    {/* Number */}
                    <div className="col-span-1 flex items-center">
                      <span className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-sm font-medium text-slate-500 group-hover:bg-slate-700/50 group-hover:text-slate-400 transition-colors">
                        {index + 1}
                      </span>
                    </div>

                    {editingStudent?._id === student._id ? (
                      <>
                        {/* Edit Mode */}
                        <div className="col-span-5 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingStudent.firstName}
                            onChange={(e) => setEditingStudent({ ...editingStudent, firstName: e.target.value })}
                            className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50"
                            placeholder="שם פרטי"
                            autoFocus
                          />
                        </div>
                        <div className="col-span-3 flex items-center">
                          <input
                            type="text"
                            value={editingStudent.lastName}
                            onChange={(e) => setEditingStudent({ ...editingStudent, lastName: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50"
                            placeholder="שם משפחה"
                          />
                        </div>
                        <div className="col-span-3 flex items-center justify-end gap-2">
                          <button
                            onClick={handleUpdateStudent}
                            className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors"
                          >
                            <FiCheck size={18} />
                          </button>
                          <button
                            onClick={() => setEditingStudent(null)}
                            className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-white transition-colors"
                          >
                            <FiX size={18} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Student Info */}
                        <div className="col-span-5 flex items-center gap-3">
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(student.firstName + student.lastName)} flex items-center justify-center shadow-md flex-shrink-0`}>
                            <span className="text-sm font-bold text-white">
                              {getInitials(student.firstName, student.lastName)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">
                              {student.firstName}
                            </p>
                            <p className="text-xs text-slate-500 md:hidden">{student.lastName}</p>
                          </div>
                        </div>

                        {/* Last Name (desktop) */}
                        <div className="col-span-3 hidden md:flex items-center">
                          <span className="text-slate-300">{student.lastName}</span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-3 flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingStudent(student)}
                            className="p-2.5 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-primary-400 transition-all duration-200"
                            title="עריכה"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student._id, `${student.firstName} ${student.lastName}`)}
                            className="p-2.5 rounded-xl hover:bg-error/20 text-slate-400 hover:text-error transition-all duration-200"
                            title="מחיקה"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer Stats */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-800/40 to-transparent border-t border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  מציג {filteredStudents.length} מתוך {students.length} תלמידים
                </span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-primary-400 hover:text-primary-300 flex items-center gap-1"
                  >
                    <FiX size={14} />
                    <span>נקה חיפוש</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Student Modal */}
      {createPortal(
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                    <FiUser size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">הוספת תלמיד חדש</h3>
                    <p className="text-sm text-slate-500">הזן את פרטי התלמיד</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">שם פרטי</label>
                    <input
                      type="text"
                      value={newStudent.firstName}
                      onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="הזן שם פרטי"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">שם משפחה</label>
                    <input
                      type="text"
                      value={newStudent.lastName}
                      onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="הזן שם משפחה"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-colors"
                    disabled={submitting}
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleAddStudent}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all"
                    disabled={submitting}
                  >
                    {submitting ? <div className="spinner w-5 h-5 mx-auto"></div> : 'הוסף תלמיד'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Bulk Add Modal */}
      {createPortal(
        <AnimatePresence>
          {showBulkModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setShowBulkModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <FiUsers size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">הוספת תלמידים מרובים</h3>
                    <p className="text-sm text-slate-500">שם פרטי ושם משפחה בכל שורה</p>
                  </div>
                </div>

                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full h-64 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
                  placeholder={`דוד, לוי\nשרה, כהן\nמשה ישראלי\nרחל אברהם`}
                  dir="rtl"
                />

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-colors"
                    disabled={submitting}
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleBulkAdd}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
                    disabled={submitting}
                  >
                    {submitting ? <div className="spinner w-5 h-5 mx-auto"></div> : `הוסף ${bulkText.split('\n').filter(l => l.trim()).length} תלמידים`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Import Excel Modal */}
      {createPortal(
        <AnimatePresence>
          {showImportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => { setShowImportModal(false); setImportFile(null); setPreviewStudents([]); }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <FiFile size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">ייבוא מאקסל</h3>
                    <p className="text-sm text-slate-500">העלה קובץ עם עמודות "שם פרטי" ו"שם משפחה"</p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadTemplate}
                  className="mb-4 text-emerald-400 text-sm flex items-center gap-2 hover:text-emerald-300 transition-colors"
                >
                  <FiDownload size={16} />
                  <span>הורד קובץ לדוגמה</span>
                </button>

                <div
                  className={`
                    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                    ${importFile 
                      ? 'border-emerald-500/50 bg-emerald-500/10' 
                      : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
                    }
                  `}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {importFile ? (
                    <div>
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <FiCheck size={28} className="text-emerald-400" />
                      </div>
                      <p className="font-medium text-white">{importFile.name}</p>
                      <p className="text-sm text-slate-500 mt-1">לחץ לבחירת קובץ אחר</p>
                    </div>
                  ) : (
                    <div>
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center">
                        <FiUpload size={28} className="text-slate-500" />
                      </div>
                      <p className="text-slate-400">לחץ או גרור קובץ Excel</p>
                      <p className="text-sm text-slate-600 mt-1">.xlsx או .xls</p>
                    </div>
                  )}
                </div>

                {/* Preview */}
                {previewStudents.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-400">
                        תצוגה מקדימה
                      </p>
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                        {previewStudents.length} תלמידים
                      </span>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-3 max-h-48 overflow-y-auto border border-slate-700/50">
                      {previewStudents.map((student, idx) => (
                        <div key={idx} className="flex items-center gap-3 py-2 border-b border-slate-700/30 last:border-0">
                          <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center text-xs text-slate-500">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-white">{student.firstName}</span>
                          <span className="text-sm text-slate-400">{student.lastName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => { setShowImportModal(false); setImportFile(null); setPreviewStudents([]); }}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleImportExcel}
                    disabled={previewStudents.length === 0 || importing}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                      ${previewStudents.length > 0 && !importing
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }
                    `}
                  >
                    {importing ? (
                      <div className="spinner w-5 h-5"></div>
                    ) : (
                      <>
                        <FiUpload size={18} />
                        <span>ייבא {previewStudents.length} תלמידים</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
