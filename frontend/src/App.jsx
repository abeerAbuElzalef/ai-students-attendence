import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiUsers, FiDownload, FiBarChart2, FiLogOut, FiUser, FiMail, FiShield } from 'react-icons/fi';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Calendar from './components/Calendar';
import StudentList from './components/StudentList';
import DailyAttendance from './components/DailyAttendance';
import ExportPanel from './components/ExportPanel';
import Statistics from './components/Statistics';
import ClassManager from './components/ClassManager';

const tabs = [
  { id: 'calendar', label: 'לוח שנה', icon: FiCalendar },
  { id: 'students', label: 'תלמידים', icon: FiUsers },
  { id: 'stats', label: 'סטטיסטיקה', icon: FiBarChart2 },
  { id: 'export', label: 'ייצוא', icon: FiDownload },
];

function UserProfile({ user, onLogout }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <FiUser size={16} className="text-white" />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{user?.name || 'משתמש'}</p>
          <p className="text-xs text-slate-400">{user?.isAdmin ? 'מנהל' : 'מורה'}</p>
        </div>
      </button>

      {/* User Details Dropdown */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute left-0 top-full mt-2 w-72 glass rounded-xl p-4 shadow-xl z-50"
        >
          <div className="space-y-3">
            <div className="text-center pb-3 border-b border-slate-700">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-2">
                <FiUser size={28} className="text-white" />
              </div>
              <h3 className="font-bold text-lg">{user?.name}</h3>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                user?.isAdmin 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
              }`}>
                {user?.isAdmin ? '👑 מנהל מערכת' : '👨‍🏫 מורה'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <FiMail size={16} className="text-slate-400" />
                <span className="text-slate-300">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FiShield size={16} className="text-slate-400" />
                <span className="text-slate-300">תפקיד: {user?.role || 'teacher'}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
            >
              <FiLogOut size={16} />
              <span>התנתק</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function AppContent() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classRefreshTrigger, setClassRefreshTrigger] = useState(0);

  // Called when students are added/removed to refresh class student counts
  const handleStudentChange = () => {
    setClassRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-slate-400">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Show admin dashboard for admin users
  if (user?.isAdmin) {
    return (
      <div className="min-h-screen">
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(30, 41, 59, 0.95)',
              color: '#f1f5f9',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              backdropFilter: 'blur(8px)',
            },
          }}
        />
        
        {/* Admin Header */}
        <header className="glass sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/25">
                  <span className="text-2xl">🎓</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold gradient-text">מערכת נוכחות</h1>
                  <p className="text-sm text-red-400">👑 מצב מנהל</p>
                </div>
              </div>

              <UserProfile user={user} onLogout={logout} />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <AdminDashboard />
        </main>

        <footer className="text-center py-6 text-slate-500 text-sm">
          <p>מערכת מעקב נוכחות תלמידים - לוח מנהל © {new Date().getFullYear()}</p>
        </footer>
      </div>
    );
  }

  const selectedClassName = classes.find(c => c._id === selectedClass)?.name || '';

  return (
    <div className="min-h-screen">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(30, 41, 59, 0.95)',
            color: '#f1f5f9',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            backdropFilter: 'blur(8px)',
          },
        }}
      />
      
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <span className="text-2xl">🎓</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">מערכת נוכחות</h1>
                <p className="text-sm text-slate-400">מעקב נוכחות תלמידים</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative px-5 py-2.5 rounded-xl font-medium transition-all duration-200
                      flex items-center gap-2
                      ${isActive 
                        ? 'text-white' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700"
                        style={{ zIndex: -1 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* User Profile */}
            <UserProfile user={user} onLogout={logout} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Class Manager */}
          <div className="w-64 flex-shrink-0">
            <ClassManager
              selectedClass={selectedClass}
              onSelectClass={setSelectedClass}
              onClassesChange={setClasses}
              refreshTrigger={classRefreshTrigger}
            />
          </div>

          {/* Main content area */}
          <div className="flex-1">
            {!selectedClass && classes.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <FiUsers size={48} className="mx-auto mb-4 text-slate-500" />
                <h2 className="text-xl font-bold mb-2">ברוך הבא, {user?.name}!</h2>
                <p className="text-slate-400 mb-4">התחל על ידי יצירת כיתה ראשונה</p>
              </div>
            ) : !selectedClass ? (
              <div className="glass rounded-2xl p-12 text-center">
                <FiUsers size={48} className="mx-auto mb-4 text-slate-500" />
                <p className="text-slate-400">בחר כיתה מהרשימה</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'calendar' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <Calendar 
                          classId={selectedClass}
                          className={selectedClassName}
                          onDateSelect={setSelectedDate}
                          selectedDate={selectedDate}
                        />
                      </div>
                      <div>
                        <DailyAttendance 
                          classId={selectedClass}
                          date={selectedDate}
                          onClose={() => setSelectedDate(null)}
                        />
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'students' && (
                    <StudentList 
                      classId={selectedClass}
                      className={selectedClassName}
                      classes={classes}
                      onStudentChange={handleStudentChange}
                    />
                  )}
                  
                  {activeTab === 'stats' && (
                    <Statistics 
                      classId={selectedClass}
                      className={selectedClassName}
                    />
                  )}
                  
                  {activeTab === 'export' && (
                    <ExportPanel 
                      classId={selectedClass}
                      className={selectedClassName}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-500 text-sm">
        <p>מערכת מעקב נוכחות תלמידים © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
