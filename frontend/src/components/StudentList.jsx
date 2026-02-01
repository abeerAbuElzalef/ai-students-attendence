import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiUpload, FiX, FiCheck, FiDownload, FiFile } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { studentApi } from '../api';

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
  const [sortBy, setSortBy] = useState('firstName'); // 'firstName' or 'lastName'
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

  // Hebrew-aware alphabetical sort by first or last name
  const sortStudents = (studentList, sortType) => {
    return [...studentList].sort((a, b) => {
      if (sortType === 'lastName') {
        const result = a.lastName.localeCompare(b.lastName, 'he');
        if (result !== 0) return result;
        return a.firstName.localeCompare(b.firstName, 'he');
      }
      // Default: sort by first name
      const result = a.firstName.localeCompare(b.firstName, 'he');
      if (result !== 0) return result;
      return a.lastName.localeCompare(b.lastName, 'he');
    });
  };

  // Get full name for display
  const getFullName = (student) => `${student.firstName} ${student.lastName}`;

  const loadStudents = async () => {
    try {
      const response = await studentApi.getAll(classId);
      const sortedStudents = sortStudents(response.data, sortBy);
      setStudents(sortedStudents);
      // Notify parent about student count change
      onStudentChange?.(sortedStudents.length);
    } catch (error) {
      toast.error('שגיאה בטעינת התלמידים');
    }
    setLoading(false);
  };

  // Re-sort when sortBy changes
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

    if (submitting) return; // Prevent double submission
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

    if (submitting) return; // Prevent double submission
    setSubmitting(true);

    // Parse each line as "firstName, lastName" or "firstName lastName"
    const studentsToAdd = lines.map(line => {
      const parts = line.includes(',') 
        ? line.split(',').map(p => p.trim())
        : line.trim().split(/\s+/);
      
      if (parts.length >= 2) {
        return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
      }
      // If only one word, use it as firstName and prompt for lastName
      return { firstName: parts[0], lastName: '' };
    }).filter(s => s.firstName && s.lastName);

    if (studentsToAdd.length === 0) {
      toast.error('נא להזין שם פרטי ושם משפחה לכל תלמיד (מופרדים בפסיק או רווח)');
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

    // Parse Excel file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        // Extract firstName and lastName from Excel columns
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
    // Create template Excel file with firstName and lastName columns
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
      {/* Header */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
              <FiUsers size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">רשימת תלמידים</h2>
              <p className="text-slate-400 text-sm">
                {className} • {students.length} תלמידים
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <FiFile size={18} />
              <span>ייבוא מאקסל</span>
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <FiUpload size={18} />
              <span>הוספה מרובה</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <FiPlus size={18} />
              <span>הוסף תלמיד</span>
            </button>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex gap-4 items-center">
          {/* Search with clear button */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="חיפוש תלמיד..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="נקה חיפוש"
              >
                <FiX size={18} />
              </button>
            )}
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">מיון:</span>
            <div className="flex rounded-xl overflow-hidden border border-slate-600">
              <button
                onClick={() => setSortBy('firstName')}
                className={`px-3 py-2 text-sm transition-colors ${
                  sortBy === 'firstName' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                שם פרטי
              </button>
              <button
                onClick={() => setSortBy('lastName')}
                className={`px-3 py-2 text-sm transition-colors ${
                  sortBy === 'lastName' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                שם משפחה
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Student list */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner w-10 h-10"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FiUsers size={48} className="mx-auto mb-4 opacity-50" />
            <p>אין תלמידים להצגה</p>
            <p className="text-sm mt-2">לחץ על "הוסף תלמיד" כדי להתחיל</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-800/50">
              <div className="col-span-1 text-sm font-semibold text-slate-400">#</div>
              <div className="col-span-7 text-sm font-semibold text-slate-400">שם התלמיד</div>
              <div className="col-span-4 text-sm font-semibold text-slate-400 text-left">פעולות</div>
            </div>

            {/* Student rows */}
            <AnimatePresence>
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.02 }}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="col-span-1 text-slate-500">{index + 1}</div>
                  
                  {editingStudent?._id === student._id ? (
                    <>
                      <div className="col-span-7 flex gap-2">
                        <input
                          type="text"
                          value={editingStudent.firstName}
                          onChange={(e) => setEditingStudent({ ...editingStudent, firstName: e.target.value })}
                          className="input-field py-1 px-3 flex-1"
                          placeholder="שם פרטי"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editingStudent.lastName}
                          onChange={(e) => setEditingStudent({ ...editingStudent, lastName: e.target.value })}
                          className="input-field py-1 px-3 flex-1"
                          placeholder="שם משפחה"
                        />
                      </div>
                      <div className="col-span-4 flex gap-2 justify-end">
                        <button
                          onClick={handleUpdateStudent}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors text-sm"
                        >
                          <FiCheck size={14} />
                          <span>שמור</span>
                        </button>
                        <button
                          onClick={() => setEditingStudent(null)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition-colors text-sm"
                        >
                          <FiX size={14} />
                          <span>ביטול</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-7 font-medium">{student.firstName} {student.lastName}</div>
                      <div className="col-span-4 flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-colors text-sm"
                          title="עריכה"
                        >
                          <FiEdit2 size={14} />
                          <span>ערוך</span>
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student._id, `${student.firstName} ${student.lastName}`)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error/20 hover:bg-error/30 text-error transition-colors text-sm"
                          title="מחיקה"
                        >
                          <FiTrash2 size={14} />
                          <span>מחק</span>
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add Student Modal - Using Portal */}
      {createPortal(
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass rounded-2xl p-6 w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">הוספת תלמיד חדש</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">שם פרטי</label>
                    <input
                      type="text"
                      value={newStudent.firstName}
                      onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                      className="input-field"
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
                      className="input-field"
                      placeholder="הזן שם משפחה"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary flex-1"
                    disabled={submitting}
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleAddStudent}
                    className="btn-primary flex-1"
                    disabled={submitting}
                  >
                    {submitting ? <div className="spinner w-5 h-5 mx-auto"></div> : 'הוסף'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Bulk Add Modal - Using Portal */}
      {createPortal(
        <AnimatePresence>
          {showBulkModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowBulkModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass rounded-2xl p-6 w-full max-w-lg mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">הוספת תלמידים מרובים</h3>
                
                <p className="text-slate-400 text-sm mb-4">
                  הזן שם פרטי ושם משפחה בכל שורה (מופרדים ברווח או פסיק)
                </p>

                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="input-field h-64 resize-none"
                  placeholder={`דוד, לוי
שרה, כהן
משה ישראלי
רחל אברהם`}
                  dir="rtl"
                />

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="btn-secondary flex-1"
                    disabled={submitting}
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleBulkAdd}
                    className="btn-primary flex-1"
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

      {/* Import Excel Modal - Using Portal */}
      {createPortal(
        <AnimatePresence>
          {showImportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => { setShowImportModal(false); setImportFile(null); setPreviewStudents([]); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">ייבוא תלמידים מאקסל</h3>
                
                <p className="text-slate-400 text-sm mb-4">
                  העלה קובץ Excel עם עמודה בשם "שם"
                </p>

                <div className="mb-4">
                  <button
                    onClick={handleDownloadTemplate}
                    className="text-primary-400 text-sm flex items-center gap-2 hover:underline"
                  >
                    <FiDownload size={16} />
                    <span>הורד קובץ לדוגמה</span>
                  </button>
                </div>

                <div
                  className={`
                    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                    ${importFile ? 'border-success bg-success/10' : 'border-slate-600 hover:border-slate-500'}
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
                      <FiCheck size={32} className="mx-auto mb-2 text-success" />
                      <p className="font-medium">{importFile.name}</p>
                      <p className="text-sm text-slate-400 mt-1">לחץ לבחירת קובץ אחר</p>
                    </div>
                  ) : (
                    <div>
                      <FiUpload size={32} className="mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400">לחץ לבחירת קובץ Excel</p>
                      <p className="text-sm text-slate-500 mt-1">.xlsx או .xls</p>
                    </div>
                  )}
                </div>

                {/* Preview */}
                {previewStudents.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-400 mb-2">
                      תצוגה מקדימה ({previewStudents.length} תלמידים):
                    </p>
                    <div className="bg-slate-800/50 rounded-xl p-3 max-h-48 overflow-y-auto">
                      {previewStudents.map((student, idx) => (
                        <div key={idx} className="py-1 text-sm border-b border-slate-700/50 last:border-0">
                          {idx + 1}. {student.firstName} {student.lastName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => { setShowImportModal(false); setImportFile(null); setPreviewStudents([]); }}
                    className="btn-secondary flex-1"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleImportExcel}
                    disabled={previewStudents.length === 0 || importing}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all
                      ${previewStudents.length > 0 && !importing ? 'btn-primary' : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'}
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
