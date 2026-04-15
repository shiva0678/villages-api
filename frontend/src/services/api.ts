import axios from 'axios';

// Base API configuration
const api = axios.create({
  baseURL: '/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach API keys/JWT automatically
api.interceptors.request.use((config) => {
  // In a real app, this would get the token/key from localStorage or Zustand
  const token = localStorage.getItem('auth_token');
  const apiKey = localStorage.getItem('api_key');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  
  return config;
});

export default api;
