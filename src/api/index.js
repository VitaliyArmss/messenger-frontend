import axios from 'axios';
import { API_URL } from './config';

const api = axios.create({
    baseURL: API_URL,
});

// Перехватчик запроса – добавляем токен
api.interceptors.request.use((config) => {
    // Пропускаем публичные эндпоинты (не добавляем токен)
    const publicEndpoints = ['/auth/login', '/auth/register', '/auth/check-email', '/auth/check-username'];
    if (publicEndpoints.some(endpoint => config.url.includes(endpoint))) {
        return config;
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Перехватчик ответа – при 401 пробуем обновить токен, но НЕ для публичных эндпоинтов
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Если это публичный эндпоинт – просто пробрасываем ошибку дальше
        const publicEndpoints = ['/auth/login', '/auth/register', '/auth/check-email', '/auth/check-username'];
        if (publicEndpoints.some(endpoint => originalRequest.url.includes(endpoint))) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');
                const { data } = await axios.post(
                    `${API_URL}/auth/refresh`,
                    { refreshToken }
                );
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;