import api from '.';

export const chatsApi = {
    getAll: () => api.get('/chats'),
    getById: (id) => api.get(`/chats/${id}`),
    getByUserId: (id) => api.get(`/chats/by-user/${id}`),
    getMembers: (id) => api.get(`/chats/${id}/members`),
    create: (data) => api.post('/chats', data),
    delete: (id) => api.delete(`/chats/${id}`),
    addMember: (chatId, userId) => api.post(`/chats/${chatId}/members`, { userId }),
    removeMember: (chatId, userId) => api.delete(`/chats/${chatId}/members/${userId}`),
    updateGroup: (chatId, data) => api.put(`/chats/${chatId}`, data), // data: { name?, avatarUrl? }
};