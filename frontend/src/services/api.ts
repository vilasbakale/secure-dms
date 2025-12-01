import axios from 'axios';
import { User, AuditLog } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/users');
  return response.data;
};

export const createUser = async (userData: {
  email: string;
  password: string;
  fullName: string;
  role: string;
}): Promise<User> => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  const response = await api.get('/users/audit-logs');
  return response.data;
};

export default api;
