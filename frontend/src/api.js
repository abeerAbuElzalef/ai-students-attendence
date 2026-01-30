import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Student API
export const studentApi = {
  getAll: () => api.get('/students'),
  getById: (id) => api.get(`/students/${id}`),
  create: (name, className) => api.post('/students', { name, className }),
  bulkCreate: (students) => api.post('/students/bulk', { students }),
  update: (id, name, className) => api.put(`/students/${id}`, { name, className }),
  delete: (id) => api.delete(`/students/${id}`)
};

// Attendance API
export const attendanceApi = {
  getByDate: (date) => api.get(`/attendance/date/${date}`),
  getByRange: (startDate, endDate) => api.get('/attendance/range', { params: { startDate, endDate } }),
  getMonthly: (year, month) => api.get(`/attendance/monthly/${year}/${month}`),
  mark: (studentId, date, status, notes) => api.post('/attendance', { studentId, date, status, notes }),
  bulkMark: (records) => api.post('/attendance/bulk', { records }),
  getStats: (startDate, endDate) => api.get('/attendance/stats', { params: { startDate, endDate } })
};

// Holiday API
export const holidayApi = {
  getByYear: (year) => api.get(`/holidays/${year}`),
  checkDate: (date) => api.get(`/holidays/check/${date}`),
  getNonSchoolDays: (startDate, endDate) => api.get('/holidays/non-school-days', { params: { startDate, endDate } })
};

// Calendar API
export const calendarApi = {
  getMonth: (year, month) => api.get(`/calendar/${year}/${month}`)
};

// Export API
export const exportApi = {
  getMonthlyReportUrl: (year, month) => `${API_BASE}/export/monthly/${year}/${month}`,
  getStudentReportUrl: (studentId, year) => `${API_BASE}/export/student/${studentId}/${year}`
};

export default api;
