import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request 攔截器：加入 Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response 攔截器：錯誤處理
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data;

    switch (status) {
      case 401:
        // Token 過期，清除並導向登入
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 403:
        console.error('權限不足:', errorData?.error?.message);
        break;
      case 409:
        // 搶單失敗 (H2)
        console.warn('併發衝突:', errorData?.error?.message);
        break;
      case 422:
        console.error('驗證錯誤:', errorData?.error?.message);
        break;
    }

    return Promise.reject(error);
  }
);
