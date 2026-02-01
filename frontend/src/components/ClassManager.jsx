import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiFolder, FiX, FiCheck, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { classApi } from '../api';

export default function ClassManager({ selectedClass, onSelectClass, onClassesChange }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({ name: '', year: '', description: '' });

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await classApi.getAll();
      setClasses(response.data);
      onClassesChange?.(response.data);
      
      // Auto-select first class if none selected
      if (response.data.length > 0 && !selectedClass) {
        onSelectClass(response.data[0]._id);
      }
    } catch (error) {
      toast.error('שגיאה בטעינת הכיתות');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('נא להזין שם כיתה');
      return;
    }

    if (submitting) return; // Prevent double submission
    setSubmitting(true);

    try {
      if (editingClass) {
        await classApi.update(editingClass._id, formData);
        toast.success('הכיתה עודכנה בהצלחה');
      } else {
        const response = await classApi.create(formData.name, formData.year, formData.description);
        // Auto-select new class
        onSelectClass(response.data._id);
        toast.success('הכיתה נוספה בהצלחה');
      }
      
      setShowModal(false);
      setEditingClass(null);
      setFormData({ name: '', year: '', description: '' });
      loadClasses();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה בשמירת הכיתה');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      year: cls.year || '',
      description: cls.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (cls) => {
    if (cls.studentCount > 0) {
      toast.error(`לא ניתן למחוק כיתה עם ${cls.studentCount} תלמידים`);
      return;
    }
    
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${cls.name}?`)) {
      return;
    }

    try {
      await classApi.delete(cls._id);
      toast.success('הכיתה נמחקה בהצלחה');
      
      // If deleted class was selected, select another
      if (selectedClass === cls._id) {
        const remaining = classes.filter(c => c._id !== cls._id);
        onSelectClass(remaining.length > 0 ? remaining[0]._id : null);
      }
      
      loadClasses();
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה במחיקת הכיתה');
    }
  };

  const openAddModal = () => {
    setEditingClass(null);
    setFormData({ name: '', year: '', description: '' });
    setShowModal(true);
  };

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiFolder className="text-primary-400" size={20} />
          <h3 className="font-semibold">כיתות</h3>
        </div>
        <button
          onClick={openAddModal}
          className="p-2 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
          title="הוסף כיתה"
        >
          <FiPlus size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="spinner w-6 h-6"></div>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-6 text-slate-400">
          <FiFolder size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">אין כיתות</p>
          <button
            onClick={openAddModal}
            className="text-primary-400 text-sm mt-2 hover:underline"
          >
            הוסף כיתה ראשונה
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {classes.map((cls) => (
            <motion.div
              key={cls._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`
                group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
                ${selectedClass === cls._id 
                  ? 'bg-gradient-to-r from-primary-600/30 to-primary-700/30 border border-primary-500/30' 
                  : 'hover:bg-slate-800/50 border border-transparent'
                }
              `}
              onClick={() => onSelectClass(cls._id)}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center
                  ${selectedClass === cls._id ? 'bg-primary-500/30' : 'bg-slate-700/50'}
                `}>
                  <FiFolder size={18} className={selectedClass === cls._id ? 'text-primary-400' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="font-medium">{cls.name}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <FiUsers size={12} />
                    <span>{cls.studentCount} תלמידים</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(cls); }}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(cls); }}
                  className="p-1.5 rounded-lg hover:bg-error/20 text-slate-400 hover:text-error transition-colors"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-md mx-4 relative z-[101]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">
                {editingClass ? 'עריכת כיתה' : 'הוספת כיתה חדשה'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    שם הכיתה *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="לדוגמה: כיתה ג1"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    שנת לימודים
                  </label>
                  <input
                    type="text"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="input-field"
                    placeholder="לדוגמה: 2025-2026"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    תיאור
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field resize-none h-20"
                    placeholder="תיאור אופציונלי..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                    disabled={submitting}
                  >
                    ביטול
                  </button>
                  <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                    {submitting ? (
                      <div className="spinner w-5 h-5 mx-auto"></div>
                    ) : editingClass ? 'עדכן' : 'הוסף'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
