import axios from 'axios';

// 1. Create the Axios Instance
// This sets the base URL for all requests
const api = axios.create({
  baseURL: 'http://localhost:8000', // Our Python API
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Request Interceptor (The "Middleman")
// Before any request is sent, this checks if we have a token 
// and attaches it to the header.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;