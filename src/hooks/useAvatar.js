import { useState, useEffect } from 'react';
import { attachmentsApi } from '../api/attachments';

// useAvatar.js
const avatarCache = new Map();

export const useAvatar = (avatarUrl) => {
    const [imageUrl, setImageUrl] = useState(() => {
        // Если уже есть в кэше – сразу возвращаем
        return avatarCache.get(avatarUrl) || null;
    });

    useEffect(() => {
        if (!avatarUrl) {
            setImageUrl(null);
            return;
        }
        // Если уже загружено – ничего не делаем
        if (avatarCache.has(avatarUrl)) {
            setImageUrl(avatarCache.get(avatarUrl));
            return;
        }
        let objectUrl = null;
        const load = async () => {
            try {
                objectUrl = await attachmentsApi.getImageUrl(avatarUrl);
                avatarCache.set(avatarUrl, objectUrl);
                setImageUrl(objectUrl);
            } catch (err) {
                console.error('Ошибка загрузки аватара', err);
                setImageUrl(null);
            }
        };
        load();
        return () => {
            // Не удаляем из кэша при размонтировании, чтобы сохранить для других
        };
    }, [avatarUrl]);

    return imageUrl;
};