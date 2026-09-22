import { useRef, useEffect, useCallback } from 'react';

export const useNotificationSound = () => {
    const audioRef = useRef(null);
    const isInitialized = useRef(false);

    // Инициализация аудио
    useEffect(() => {
        if (!isInitialized.current) {
            // Создаём аудио с тихим звуком (можно заменить на свой)
            audioRef.current = new Audio(`${import.meta.env.BASE_URL}notification-sound.mp3`)
            audioRef.current.volume = 0.2;
            // Предзагрузка
            audioRef.current.load();
            isInitialized.current = true;
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
                isInitialized.current = false;
            }
        };
    }, []);

    const playSound = useCallback(() => {
        if (!audioRef.current) return;

        try {
            // Перезапускаем звук, если он уже играет
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(err => {
                // Игнорируем ошибки автоплея
                console.debug('Audio play failed:', err);
            });
        } catch (err) {
            console.debug('Audio error:', err);
        }
    }, []);

    return playSound;
};