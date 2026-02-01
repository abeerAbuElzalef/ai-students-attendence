import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Auth API
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// Class API
export const classApi = {
  getAll: () => api.get('/classes'),
  getById: (id) => api.get(`/classes/${id}`),
  create: (name, year, description) => api.post('/classes', { name, year, description }),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`)
};

// Student API
export const studentApi = {
  getAll: (classId = null) => api.get('/students', { params: { classId } }),
  getById: (id) => api.get(`/students/${id}`),
  create: (name, classId, notes) => api.post('/students', { name, classId, notes }),
  bulkCreate: (students, classId) => api.post('/students/bulk', { students, classId }),
  import: (formData) => api.post('/students/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadTemplate: () => `${API_BASE}/students/download/template`,
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  move: (id, classId) => api.post(`/students/${id}/move`, { classId })
};

// Attendance API
export const attendanceApi = {
  getByDate: (date, classId = null) => api.get(`/attendance/date/${date}`, { params: { classId } }),
  getByRange: (startDate, endDate, classId = null) => 
    api.get('/attendance/range', { params: { startDate, endDate, classId } }),
  getMonthly: (year, month, classId = null) => 
    api.get(`/attendance/monthly/${year}/${month}`, { params: { classId } }),
  mark: (studentId, date, status, notes) => 
    api.post('/attendance', { studentId, date, status, notes }),
  bulkMark: (records) => api.post('/attendance/bulk', { records }),
  getStats: (startDate, endDate, classId = null) => 
    api.get('/attendance/stats', { params: { startDate, endDate, classId } })
};

// Holiday API
export const holidayApi = {
  getByYear: (year) => api.get(`/holidays/${year}`),
  checkDate: (date) => api.get(`/holidays/check/${date}`),
  getNonSchoolDays: (startDate, endDate) => 
    api.get('/holidays/non-school-days', { params: { startDate, endDate } })
};

// Calendar API
export const calendarApi = {
  getMonth: (year, month, classId = null) => 
    api.get(`/calendar/${year}/${month}`, { params: { classId } })
};

// Export API
export const exportApi = {
  getMonthlyReportUrl: (year, month, classId = null) => {
    const params = classId ? `?classId=${classId}` : '';
    return `${API_BASE}/export/monthly/${year}/${month}${params}`;
  },
  getStudentReportUrl: (studentId, year) => `${API_BASE}/export/student/${studentId}/${year}`
};

export default api;
