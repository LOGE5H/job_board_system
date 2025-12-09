import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  registerEmployer: (data) => api.post('/auth/register/employer', data),
  registerCandidate: (data) => api.post('/auth/register/candidate', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (token) => api.get(`/auth/verify/${token}`),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// Jobs API
export const jobsAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  getRecent: (limit = 6) => api.get('/jobs/recent', { params: { limit } }),
  getById: (id) => api.get(`/jobs/${id}`),
  getCategories: () => api.get('/jobs/categories'),
  getTrendingCategories: () => api.get('/jobs/categories/trending'),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  report: (id, data) => api.post(`/jobs/${id}/report`, data)
};

// Employer API
export const employerAPI = {
  getDashboard: () => api.get('/employer/dashboard'),
  getJobs: (params) => api.get('/employer/jobs', { params }),
  getJobApplications: (jobId, params) => api.get(`/employer/jobs/${jobId}/applications`, { params }),
  getApplicants: (jobId, params) => api.get(`/employer/jobs/${jobId}/applications`, { params }),
  getCandidateProfile: (applicationId) => api.get(`/employer/applications/${applicationId}/candidate`),
  updateApplicationStatus: (id, status) => api.put(`/employer/applications/${id}/status`, { status }),
  updateProfile: (data) => api.put('/employer/profile', data),
  uploadLogo: (formData) => api.post('/employer/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getCompanyPage: (id) => api.get(`/employer/company/${id}`),
  getRecommendedCandidates: (jobId) => api.get(`/employer/jobs/${jobId}/recommended-candidates`)
};

// Candidate API
export const candidateAPI = {
  getDashboard: () => api.get('/candidate/dashboard'),
  getProfile: () => api.get('/candidate/profile'),
  updateProfile: (data) => api.put('/candidate/profile', data),
  uploadResume: (formData) => api.post('/candidate/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadProfilePicture: (formData) => api.post('/candidate/profile-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  applyToJob: (jobId, formData) => api.post(`/candidate/apply/${jobId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getApplications: (params) => api.get('/candidate/applications', { params }),
  checkApplication: (jobId) => api.get(`/candidate/applications/check/${jobId}`),
  getSavedJobs: (params) => api.get('/candidate/saved-jobs', { params }),
  saveJob: (jobId) => api.post(`/candidate/saved-jobs/${jobId}`),
  unsaveJob: (jobId) => api.delete(`/candidate/saved-jobs/${jobId}`),
  checkSavedJob: (jobId) => api.get(`/candidate/saved-jobs/check/${jobId}`),
  getRecommendedJobs: () => api.get('/candidate/recommended-jobs')
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications')
};

// Analytics API
export const analyticsAPI = {
  getPublic: () => api.get('/analytics/public')
};

export default api;
