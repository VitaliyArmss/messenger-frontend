// components/FileTabs.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { attachmentsApi } from '../api/attachments';
import { getchatConnection } from '../api/signalr';
import AttachmentItem from './AttachmentItem';
import '../css/index.css';

const TAKE = 20;

// Сопоставление вкладок с FileType (числовые значения)
const getFileTypeValue = (tab) => {
    switch (tab) {
        case 'media':
            return 1;   // Media
        case 'music':
            return 2;   // Sound
        case 'files':
            return 0;   // File
        case 'links':
            return null; // все файлы (без фильтра)
        default:
            return null;
    }
};

const FileTabs = ({ chatId }) => {
    const [activeTab, setActiveTab] = useState('media');
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [skip, setSkip] = useState(0);
    const loaderRef = useRef(null);

    const loadAttachments = useCallback(async (reset = false) => {
        if (!chatId || loading) return;
        const currentSkip = reset ? 0 : skip;
        const type = getFileTypeValue(activeTab);

        setLoading(true);
        try {
            const res = await attachmentsApi.getByChat(chatId, type, currentSkip, TAKE);
            const newItems = res.data;

            if (reset) {
                setAttachments(newItems);
                setSkip(TAKE);
                setHasMore(newItems.length === TAKE);
            } else {
                // Фильтруем дубликаты
                setAttachments(prev => {
                    const newUnique = newItems.filter(item => !prev.some(p => p.id === item.id));
                    return [...prev, ...newUnique];
                });
                setSkip(prevSkip => prevSkip + TAKE);
                setHasMore(newItems.length === TAKE);
            }
        } catch (err) {
            console.error('Ошибка загрузки вложений:', err);
        } finally {
            setLoading(false);
        }
    }, [chatId, activeTab, skip, loading]);

    // Сброс при смене чата или вкладки
    useEffect(() => {
        if (!chatId) return;
        setAttachments([]);
        setSkip(0);
        setHasMore(true);
        loadAttachments(true);
    }, [chatId, activeTab]);

    // Бесконечный скролл
    useEffect(() => {
        if (!loaderRef.current || !hasMore || loading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadAttachments(false);
                }
            },
            { rootMargin: '0px 0px 100px 0px', threshold: 0.1 }
        );

        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadAttachments]);

    useEffect(() => {
        const connection = getchatConnection();
        if (!connection) return;

        const handleAttachmentAdded = (data) => {
            // Обновляем только для текущего чата
            if (data.chatId !== chatId) return;
            // Перезагружаем список вложений для текущей вкладки
            loadAttachments(true);
        };

        connection.on("AttachmentAdded", handleAttachmentAdded);

        return () => {
            connection.off("AttachmentAdded", handleAttachmentAdded);
        };
    }, [chatId, loadAttachments]);

    const tabs = [
        { id: 'media', label: 'Media', icon: '🖼️' },
        { id: 'files', label: 'Files', icon: '📄' },
        { id: 'links', label: 'Links', icon: '🔗' },
        { id: 'music', label: 'Music', icon: '🎵' },
    ];

    const isMediaTab = activeTab === 'media';

    return (
        <div className="file-tabs">
            <div className="tabs-header">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="tabs-content">
                {loading && attachments.length === 0 && <p>Загрузка...</p>}
                {!loading && attachments.length === 0 && (
                    <p className="empty-state">Нет {activeTab}</p>
                )}

                {attachments.length > 0 && (
                    isMediaTab ? (
                        // Сетка для Media
                        <div className="attachment-grid">
                            {attachments.map(item => (
                                <div key={item.id} className="attachment-grid-item">
                                    <AttachmentItem attachment={item} preloadedUrl={null} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Список для остальных вкладок
                        <ul className="attachment-list">
                            {attachments.map(item => (
                                <li key={item.id} className="attachment-item">
                                    <AttachmentItem attachment={item} preloadedUrl={null} />
                                </li>
                            ))}
                        </ul>
                    )
                )}

                {hasMore && (
                    <div ref={loaderRef} className="load-more-trigger">
                        {loading && <span>Загрузка...</span>}
                    </div>
                )}
                {!hasMore && attachments.length > 0 && (
                    <p className="all-loaded">Все загружено</p>
                )}
            </div>
        </div>
    );
};

export default FileTabs;