import api from '.';

export const authApi = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
    checkEmail: (email) =>
        api.get(`/auth/check-email?email=${encodeURIComponent(email)}`),
    checkUsername: (username) =>
        api.get(`/auth/check-username?username=${encodeURIComponent(username)}`),
};