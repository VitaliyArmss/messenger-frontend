// messages.js
import api from '.';

export const messagesApi = {
    getByChat: (chatId, skip = 0, take = 50) =>
        api.get(`/messages/chat/${chatId}?skip=${skip}&take=${take}`),
    getMessagesAround: (chatId, messageId, count = 50) =>
        api.get(`/messages/chat/${chatId}/around/${messageId}?count=${count}`),
    getByDirection: (chatId, messageId, direction, count = 50) =>
        api.get(`/messages/chat/${chatId}/direction/${messageId}?direction=${direction}&count=${count}`),
    getFirstUnread: (chatId) => api.get(`/messages/chat/${chatId}/first-unread`),
    send: (chatId, data) => api.post(`/messages/chat/${chatId}`, data),
    edit: (messageId, text) => api.put(`/messages/${messageId}`, { text }),
    delete: (messageId) => api.delete(`/messages/${messageId}`),
    markBatchAsRead: (chatId, messageIds) =>
        api.post(`/messages/chat/${chatId}/mark-read-batch`, messageIds),
};