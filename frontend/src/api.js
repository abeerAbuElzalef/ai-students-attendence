import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (firstName, lastName, email, password) => api.post('/auth/register', { firstName, lastName, email, password }),
  getMe: () => api.get('/auth/me')
};

// Class API
export const classApi = {
  getAll: () => api.get('/classes'),
  getById: (id) => api.get(`/classes/${id}`),
  create: (name) => api.post('/classes', { name }),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`)
};

// Student API
export const studentApi = {
  getAll: (classId = null) => api.get('/students', { params: { classId } }),
  getById: (id) => api.get(`/students/${id}`),
  create: (firstName, lastName, classId) => api.post('/students', { firstName, lastName, classId }),
  import: (classId, students) => api.post('/students/import', { classId, students }),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`)
};

// Attendance API
export const attendanceApi = {
  getByDate: (date, classId = null) => api.get('/attendance', { params: { date, classId } }),
  mark: (studentId, date, present, classId) => 
    api.post('/attendance', { studentId, date, present, classId })
};

// Holiday API
export const holidayApi = {
  getByMonth: (year, month) => api.get(`/holidays/${year}/${month}`)
};

// Calendar API
export const calendarApi = {
  getMonth: (year, month, classId = null) => 
    api.get(`/calendar/${year}/${month}`, { params: { classId } })
};

// Export API
export const exportApi = {
  downloadMonthlyReport: (year, month, classId = null) => 
    api.get('/export/monthly', { 
      params: { year, month, classId },
      responseType: 'blob'
    }),
  downloadStudentReport: (studentId, year) =>
    api.get('/export/student', {
      params: { studentId, year },
      responseType: 'blob'
    })
};

// Admin API with pagination and sorting
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getTeachers: (page = 1, limit = 20, sortBy = 'firstName') => 
    api.get('/admin/teachers', { params: { page, limit, sortBy } }),
  deleteTeacher: (id) => api.delete(`/admin/teachers/${id}`),
  getClasses: (page = 1, limit = 20) => 
    api.get('/admin/classes', { params: { page, limit } }),
  deleteClass: (id) => api.delete(`/admin/classes/${id}`)
};

export default api;
