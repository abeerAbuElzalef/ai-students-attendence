import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiLogIn, FiUserPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('התחברת בהצלחה!');
      } else {
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
          toast.error('נא להזין שם פרטי ושם משפחה');
          setLoading(false);
          return;
        }
        await register(formData.firstName, formData.lastName, formData.email, formData.password);
        toast.success('נרשמת בהצלחה!');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {/* Logo and title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-xl shadow-primary-500/25"
          >
            <span className="text-5xl">🎓</span>
          </motion.div>
          <h1 className="text-3xl font-bold gradient-text mb-2">מערכת נוכחות</h1>
          <p className="text-slate-400">מעקב נוכחות תלמידים</p>
        </div>

        {/* Form card */}
        <div className="glass rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                ${isLogin 
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white' 
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
            >
              <FiLogIn size={18} />
              <span>התחברות</span>
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                ${!isLogin 
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white' 
                  : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
            >
              <FiUserPlus size={18} />
              <span>הרשמה</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name fields (only for register) */}
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    שם פרטי
                  </label>
                  <div className="relative">
                    <FiUser className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="input-field pr-12"
                      placeholder="הזן שם פרטי"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    שם משפחה
                  </label>
                  <div className="relative">
                    <FiUser className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="input-field pr-12"
                      placeholder="הזן שם משפחה"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                אימייל
              </label>
              <div className="relative">
                <FiMail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field pr-12"
                  placeholder="name@example.com"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                סיסמה
              </label>
              <div className="relative">
                <FiLock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <div className="spinner w-5 h-5"></div>
              ) : isLogin ? (
                <>
                  <FiLogIn size={18} />
                  <span>התחבר</span>
                </>
              ) : (
                <>
                  <FiUserPlus size={18} />
                  <span>הירשם</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-slate-500 text-sm">
          מערכת מעקב נוכחות תלמידים © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
