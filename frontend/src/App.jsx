import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiUsers, FiDownload, FiBarChart2 } from 'react-icons/fi';

import Calendar from './components/Calendar';
import StudentList from './components/StudentList';
import DailyAttendance from './components/DailyAttendance';
import ExportPanel from './components/ExportPanel';
import Statistics from './components/Statistics';

const tabs = [
  { id: 'calendar', label: 'לוח שנה', icon: FiCalendar },
  { id: 'students', label: 'תלמידים', icon: FiUsers },
  { id: 'stats', label: 'סטטיסטיקה', icon: FiBarChart2 },
  { id: 'export', label: 'ייצוא', icon: FiDownload },
];

function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(null);

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
                <span className="text-2xl font-bold text-white">נ</span>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
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
                    onDateSelect={setSelectedDate}
                    selectedDate={selectedDate}
                  />
                </div>
                <div>
                  <DailyAttendance 
                    date={selectedDate}
                    onClose={() => setSelectedDate(null)}
                  />
                </div>
              </div>
            )}
            
            {activeTab === 'students' && <StudentList />}
            
            {activeTab === 'stats' && <Statistics />}
            
            {activeTab === 'export' && <ExportPanel />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-500 text-sm">
        <p>מערכת מעקב נוכחות תלמידים © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
