import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Unwrap axios error messages to match the shape pages expect
client.interceptors.response.use(
  res => res,
  err => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Request failed';
    const wrapped = new Error(msg);
    wrapped.status = err.response?.status;
    return Promise.reject(wrapped);
  },
);

export const api = {
  get:    (path, config) => client.get(path, config),
  post:   (path, body)   => client.post(path, body),
  put:    (path, body)   => client.put(path, body),
  patch:  (path, body)   => client.patch(path, body),
  delete: (path)         => client.delete(path),
};
