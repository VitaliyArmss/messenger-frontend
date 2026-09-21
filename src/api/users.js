import api from '.';

export const usersApi = {
    getCurrent: () => api.get('/users/me'),
    getById: (id) => api.get(`/users/${id}`),
    getContacts: () => api.get(`/users/contacts`),
    search: (query, page = 1, pageSize = 10) =>
        api.get(`/users?query=${query || ''}&page=${page}&pageSize=${pageSize}`),
    update: (formData) =>
        api.put('/users', formData),
};