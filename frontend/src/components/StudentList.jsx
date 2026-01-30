import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiUpload, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { studentApi } from '../api';

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [newStudent, setNewStudent] = useState({ name: '', className: '' });
  const [bulkText, setBulkText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await studentApi.getAll();
      setStudents(response.data);
    } catch (error) {
      toast.error('שגיאה בטעינת התלמידים');
    }
    setLoading(false);
  };

  const handleAddStudent = async () => {
    if (!newStudent.name.trim()) {
      toast.error('נא להזין שם תלמיד');
      return;
    }

    try {
      await studentApi.create(newStudent.name, newStudent.className);
      toast.success('התלמיד נוסף בהצלחה');
      setShowAddModal(false);
      setNewStudent({ name: '', className: '' });
      loadStudents();
    } catch (error) {
      toast.error('שגיאה בהוספת התלמיד');
    }
  };

  const handleBulkAdd = async () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      toast.error('נא להזין שמות תלמידים');
      return;
    }

    const studentsToAdd = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        name: parts[0],
        className: parts[1] || ''
      };
    });

    try {
      await studentApi.bulkCreate(studentsToAdd);
      toast.success(`${studentsToAdd.length} תלמידים נוספו בהצלחה`);
      setShowBulkModal(false);
      setBulkText('');
      loadStudents();
    } catch (error) {
      toast.error('שגיאה בהוספת התלמידים');
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent.name.trim()) {
      toast.error('נא להזין שם תלמיד');
      return;
    }

    try {
      await studentApi.update(editingStudent.id, editingStudent.name, editingStudent.class_name);
      toast.success('התלמיד עודכן בהצלחה');
      setEditingStudent(null);
      loadStudents();
    } catch (error) {
      toast.error('שגיאה בעדכון התלמיד');
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
      toast.error('שגיאה במחיקת התלמיד');
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.includes(searchTerm) || 
    (student.class_name && student.class_name.includes(searchTerm))
  );

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
              <p className="text-slate-400 text-sm">{students.length} תלמידים רשומים</p>
            </div>
          </div>

          <div className="flex gap-3">
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

        {/* Search */}
        <input
          type="text"
          placeholder="חיפוש תלמיד..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field"
        />
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
              <div className="col-span-5 text-sm font-semibold text-slate-400">שם התלמיד</div>
              <div className="col-span-4 text-sm font-semibold text-slate-400">כיתה</div>
              <div className="col-span-2 text-sm font-semibold text-slate-400">פעולות</div>
            </div>

            {/* Student rows */}
            <AnimatePresence>
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.02 }}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="col-span-1 text-slate-500">{index + 1}</div>
                  
                  {editingStudent?.id === student.id ? (
                    <>
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={editingStudent.name}
                          onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                          className="input-field py-1 px-3"
                          autoFocus
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={editingStudent.class_name || ''}
                          onChange={(e) => setEditingStudent({ ...editingStudent, class_name: e.target.value })}
                          className="input-field py-1 px-3"
                        />
                      </div>
                      <div className="col-span-2 flex gap-2">
                        <button
                          onClick={handleUpdateStudent}
                          className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors"
                        >
                          <FiCheck size={16} />
                        </button>
                        <button
                          onClick={() => setEditingStudent(null)}
                          className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition-colors"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-5 font-medium">{student.name}</div>
                      <div className="col-span-4 text-slate-400">{student.class_name || '-'}</div>
                      <div className="col-span-2 flex gap-2">
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="p-2 rounded-lg hover:bg-error/20 text-slate-400 hover:text-error transition-colors"
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
        )}
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
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
                  <label className="block text-sm font-medium text-slate-400 mb-2">שם התלמיד</label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="input-field"
                    placeholder="הזן שם מלא"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">כיתה (אופציונלי)</label>
                  <input
                    type="text"
                    value={newStudent.className}
                    onChange={(e) => setNewStudent({ ...newStudent, className: e.target.value })}
                    className="input-field"
                    placeholder="לדוגמה: א׳1"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  ביטול
                </button>
                <button
                  onClick={handleAddStudent}
                  className="btn-primary flex-1"
                >
                  הוסף
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Add Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
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
                הזן שם תלמיד בכל שורה. ניתן להוסיף כיתה אחרי פסיק.
                <br />
                <span className="text-slate-500">לדוגמה: יוסי כהן, א׳1</span>
              </p>

              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="input-field h-64 resize-none"
                placeholder={`דוד לוי, א׳1
שרה כהן, א׳1
משה ישראלי, א׳2
רחל אברהם`}
                dir="rtl"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="btn-secondary flex-1"
                >
                  ביטול
                </button>
                <button
                  onClick={handleBulkAdd}
                  className="btn-primary flex-1"
                >
                  הוסף {bulkText.split('\n').filter(l => l.trim()).length} תלמידים
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
