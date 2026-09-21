import api from '.';

const getAttachmentId = (urlOrId) => {
    if (!urlOrId) return null;

    if (!urlOrId.includes('/')) {
        return urlOrId;
    }

    return urlOrId.split('/').filter(Boolean).pop();
};

export const attachmentsApi = {
    upload: (file, isAvatar = false) => {
        const formData = new FormData();
        formData.append('file', file);
        const params = new URLSearchParams();
        if (isAvatar) {
            params.append('isAvatar', 'true');
        }
        const url = `/attachments${params.toString() ? '?' + params.toString() : ''}`;
        return api.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    delete: (id) =>
        api.delete(`/attachments/${id}`),

    download: (id) =>
        api.get(`/attachments/${id}`, {
            responseType: 'blob',
        }),

    getByChat: (chatId, type, skip = 0, take = 20) =>
        api.get(`/attachments/chat/${chatId}`, {
            params: { type, skip, take },
        }),

    /**
     * Загружает защищённое изображение backend'а
     * и возвращает blob: URL для <img src="">
     */
    getImageUrl: async (urlOrId) => {
        const id = getAttachmentId(urlOrId);

        if (!id) {
            return null;
        }

        const response = await api.get(`/attachments/${id}`, {
            responseType: 'blob',
        });

        return URL.createObjectURL(response.data);
    },

    getIdFromUrl: getAttachmentId,
};