import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: apiBaseUrl });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rentmate-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && localStorage.getItem('rentmate-token')) {
    localStorage.removeItem('rentmate-token');
    window.dispatchEvent(new Event('rentmate:logout'));
  }
  return Promise.reject(error);
});
export const imageUrl = (image) => {
  if (!image) return '';
  if (image.startsWith('http') || image.startsWith('data:')) return image;
  const base = apiBaseUrl.replace(/\/api\/?$/, '');
  return `${base}${image}`;
};
export const errorMessage = (error) => error.response?.data?.message || 'Something went wrong. Please try again.';
export default api;
