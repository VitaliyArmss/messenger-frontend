// Chat.jsx
import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';

import { messagesApi } from '../api/messages';
import { startChatConnection } from '../api/signalr';
import { chatsApi } from '../api/chats';
import { attachmentsApi } from '../api/attachments';

import { useAuth } from '../context/AuthContext';
import { useAvatar } from '../hooks/useAvatar';

import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import MessageContextMenu from './MessageContextMenu';
import NullAvatar from './NullAvatar';
import MessageActionModal from './MessageActionModal';

import '../css/index.css';

const TAKE = 50;
const SCROLL_DEBOUNCE = 300;
const SCROLL_THRESHOLD = 100;

const Chat = () => {
    const { chatId } = useParams();
    const { user } = useAuth();
    const { openChatInfo, lastReadMap, setLastReadMap, updateChat, updatedUser } = useOutletContext();

    // ===================== СОСТОЯНИЯ =====================
    const [chat, setChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLoading, setShowLoading] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [imageUrls, setImageUrls] = useState({});
    const [messageModal, setMessageModal] = useState(null);

    const avatarBlob = useAvatar(chat?.avatarUrl);
    const navigate = useNavigate();

    // ===================== РЕФЫ =====================
    // Сообщения
    const addedIdsRef = useRef(new Set());
    const messageListRef = useRef(null);
    const startMessageIdRef = useRef(null);
    const oldestMessageIdRef = useRef(null);
    const newestMessageIdRef = useRef(null);
    const loadingMoreOldRef = useRef(false);
    const loadingMoreNewRef = useRef(false);

    // Флаги
    const hasMoreOldRef = useRef(true);
    const hasMoreNewRef = useRef(true);
    const isInitialScrollDone = useRef(false);
    const hasScrolledRef = useRef(false);

    // SignalR
    const connectionRef = useRef(null);
    const receiveHandlerRef = useRef(null);
    const currentChatIdRef = useRef(chatId);

    // Пагинация
    const paginationTimerRef = useRef(null);
    const lastScrollDirectionRef = useRef(null);

    // Чтение сообщений
    const [observedMessageIds, setObservedMessageIds] = useState(new Set());
    const [pendingReadIds, setPendingReadIds] = useState([]);
    const readTimeoutRef = useRef(null);

    // ===================== ПРОКРУТКА =====================

    const isNearBottom = useCallback(() => {
        const container = messageListRef.current;
        if (!container) return true;
        const distanceFromBottom =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight;
        return distanceFromBottom <= 150;
    }, []);

    const scrollToMessage = useCallback((messageId, behavior = 'smooth') => {
        const container = messageListRef.current;
        if (!container || !messageId) return;
        const targetEl = container.querySelector(`[data-message-id="${messageId}"]`);
        if (targetEl) {
            const containerRect = container.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            const offset = targetRect.top - containerRect.top - 100;
            container.scrollTo({ top: container.scrollTop + offset, behavior });
        }
    }, []);

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        const container = messageListRef.current;
        if (!container) return;
        container.scrollTo({ top: container.scrollHeight, behavior });
    }, []);

    // ===================== ХЕДЕР =====================

    const handleHeaderClick = () => {
        openChatInfo(chatId);
    };

    // ===================== ОТПРАВКА СООБЩЕНИЯ =====================

    const handleSend = async (text, attachments = []) => {
        if (!chatId || !user) return;

        try {
            // Если мы ещё не дошли до конца истории,
            // сначала догружаем все новые сообщения.
            while (hasMoreNewRef.current) {
                const previousNewestId =
                    newestMessageIdRef.current;

                await loadMoreNew();

                // Защита от бесконечного цикла,
                // если API вернул те же сообщения.
                if (
                    previousNewestId ===
                    newestMessageIdRef.current
                ) {
                    break;
                }
            }

            // Теперь мы точно на конце загруженной истории.
            const payload = {
                text,
                attachments,
                isSystem: false
            };

            await messagesApi.send(
                chatId,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem(
                            'accessToken'
                        )}`,
                    },
                }
            );

            // После отправки прокручиваемся вниз.
            setTimeout(() => {
                scrollToBottom('smooth');
            }, 100);
        } catch (err) {
            console.error(
                'Ошибка отправки:',
                err
            );
        }
    };

    // ===================== КОНТЕКСТНОЕ МЕНЮ =====================

    const openContextMenu = (e, message) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, message });
    };

    const closeContextMenu = () => setContextMenu(null);

    const handleCopyText = (message) => {
        navigator.clipboard.writeText(message.text).catch(console.error);
    };

    const handleEditMessage = (message) => {
        setMessageModal({
            type: 'edit',
            message
        });
    };

    const handleDeleteMessage = (message) => {
        setMessageModal({
            type: 'delete',
            message
        });
    };

    const closeMessageModal = () => {
        setMessageModal(null);
    };

    const handleMessageModalConfirm = async (text) => {
        if (!messageModal?.message) return;

        try {
            if (messageModal.type === 'edit') {
                await messagesApi.edit(messageModal.message.id, text);
            } else {
                await messagesApi.delete(messageModal.message.id);
            }

            closeMessageModal();
        } catch (err) {
            console.error(
                messageModal.type === 'edit'
                    ? 'Ошибка редактирования:'
                    : 'Ошибка удаления:',
                err
            );
        }
    };

    // ===================== ЗАГРУЗКА ИЗОБРАЖЕНИЙ =====================

    const loadImagesForMessages = async (messagesData) => {
        const attachments = messagesData.flatMap(msg => msg.attachments || []);
        const imageAttachments = attachments.filter(
            a => a.contentType?.startsWith('image/')
        );
        const urlMap = {};
        await Promise.all(
            imageAttachments.map(async (att) => {
                try {
                    const response = await attachmentsApi.download(att.id);
                    const blob = response.data;
                    const url = URL.createObjectURL(blob);
                    urlMap[att.id] = url;
                } catch (err) {
                    console.error('Ошибка загрузки изображения', att.id, err);
                }
            })
        );
        setImageUrls(prev => ({ ...prev, ...urlMap }));
    };

    // ===================== ЗАГРУЗКА СООБЩЕНИЙ =====================

    const loadMessagesAround = async (startId, currentChatId) => {
        try {
            const res = await messagesApi.getMessagesAround(currentChatId, startId, TAKE);
            if (currentChatId !== chatId) return;

            const fetched = res.data;
            console.log(`📥 Загружено ${fetched.length} сообщений вокруг`);

            setMessages(fetched);
            addedIdsRef.current = new Set(fetched.map(m => m.id));
            await loadImagesForMessages(fetched);

            startMessageIdRef.current = startId;

            if (fetched.length > 0) {
                oldestMessageIdRef.current = fetched[0].id;
                newestMessageIdRef.current = fetched[fetched.length - 1].id;
                hasMoreOldRef.current = true;
                hasMoreNewRef.current = true;
            } else {
                hasMoreOldRef.current = false;
                hasMoreNewRef.current = false;
            }
        } catch (err) {
            if (currentChatId !== chatId) return;
            console.error('Ошибка загрузки сообщений вокруг:', err);
            if (err.response?.status === 404) {
                setLastReadMap(prev => {
                    const newMap = { ...prev };
                    delete newMap[currentChatId];
                    return newMap;
                });
            }
            isInitialScrollDone.current = true;
        }
    };

    // ===================== ПАГИНАЦИЯ =====================

    const loadMoreOld = useCallback(async () => {
        if (
            loadingMoreOldRef.current ||
            !oldestMessageIdRef.current ||
            !hasMoreOldRef.current
        ) {
            console.log('⛔ Пропускаем загрузку старых');
            return;
        }

        console.log('⬆️ Загружаем старые сообщения...');

        loadingMoreOldRef.current = true;

        try {
            const res = await messagesApi.getByDirection(
                chatId,
                oldestMessageIdRef.current,
                'older',
                TAKE
            );

            const fetched = res.data;

            console.log(`📥 Получено ${fetched.length} старых сообщений`, fetched);

            if (fetched.length === 0) {
                hasMoreOldRef.current = false;
                return;
            }

            const newUnique = fetched.filter(
                msg => !addedIdsRef.current.has(msg.id)
            );

            console.log(`🆕 Новых уникальных старых: ${newUnique.length}`);

            if (newUnique.length === 0) {
                if (fetched.length < TAKE) {
                    hasMoreOldRef.current = false;
                }
                return;
            }

            newUnique.forEach(msg => addedIdsRef.current.add(msg.id));

            const container = messageListRef.current;
            const scrollHeightBefore = container?.scrollHeight ?? 0;
            const scrollTopBefore = container?.scrollTop ?? 0;

            setMessages(prev => [...newUnique, ...prev]);

            await loadImagesForMessages(newUnique);

            requestAnimationFrame(() => {
                if (!container) return;

                const heightDelta =
                    container.scrollHeight - scrollHeightBefore;

                container.scrollTop =
                    scrollTopBefore + heightDelta;
            });

            oldestMessageIdRef.current = newUnique[0].id;

            if (fetched.length < TAKE) {
                hasMoreOldRef.current = false;
            }

            console.log('✅ Старые сообщения загружены');
        } catch (err) {
            console.error('❌ Ошибка загрузки старых:', err);
        } finally {
            loadingMoreOldRef.current = false;
        }
    }, [chatId]);

    const loadMoreNew = useCallback(async () => {
        if (
            loadingMoreNewRef.current ||
            !newestMessageIdRef.current ||
            !hasMoreNewRef.current
        ) {
            console.log('⛔ Пропускаем загрузку новых');
            return;
        }

        console.log('⬇️ Загружаем новые сообщения...');

        loadingMoreNewRef.current = true;

        try {
            const res = await messagesApi.getByDirection(
                chatId,
                newestMessageIdRef.current,
                'newer',
                TAKE
            );

            const fetched = res.data;

            console.log(`📥 Получено ${fetched.length} новых сообщений`);

            if (fetched.length === 0) {
                hasMoreNewRef.current = false;
                return;
            }

            const newUnique = fetched.filter(
                msg => !addedIdsRef.current.has(msg.id)
            );

            console.log(`🆕 Новых уникальных новых: ${newUnique.length}`);

            if (newUnique.length === 0) {
                if (fetched.length < TAKE) {
                    hasMoreNewRef.current = false;
                }
                return;
            }

            newUnique.forEach(msg => {
                addedIdsRef.current.add(msg.id);
            });

            setMessages(prev => [
                ...prev,
                ...newUnique
            ]);

            await loadImagesForMessages(newUnique);

            newestMessageIdRef.current =
                newUnique[newUnique.length - 1].id;

            if (fetched.length < TAKE) {
                hasMoreNewRef.current = false;
            }

            console.log('✅ Новые сообщения загружены');
        } catch (err) {
            console.error(
                '❌ Ошибка загрузки новых:',
                err
            );
        } finally {
            loadingMoreNewRef.current = false;
        }
    }, [chatId]);

    // ===================== SCROLL HANDLER С DEBOUNCE =====================

    useEffect(() => {
        if (loading || showLoading) return;

        const container = messageListRef.current;

        if (!container) {
            console.warn('⚠️ messageListRef отсутствует');
            return;
        }

        console.log('✅ Scroll listener установлен');

        const handleScroll = () => {
            if (!isInitialScrollDone.current) {
                return;
            }

            const {
                scrollTop,
                scrollHeight,
                clientHeight
            } = container;

            console.log('🔥 SCROLL', {
                scrollTop,
                scrollHeight,
                clientHeight
            });

            const distanceFromBottom =
                scrollHeight -
                scrollTop -
                clientHeight;

            // ==========================================
            // ВЕРХ
            // ==========================================

            if (scrollTop <= SCROLL_THRESHOLD) {
                console.log('🔼 Достигнут верх');

                if (
                    !loadingMoreOldRef.current &&
                    hasMoreOldRef.current
                ) {
                    loadMoreOld();
                }

                return;
            }

            // ==========================================
            // НИЗ
            // ==========================================

            if (distanceFromBottom <= SCROLL_THRESHOLD) {
                console.log('🔽 Достигнут низ');

                if (
                    !loadingMoreNewRef.current &&
                    hasMoreNewRef.current
                ) {
                    loadMoreNew();
                }

                return;
            }
        };

        container.addEventListener(
            'scroll',
            handleScroll,
            { passive: true }
        );

        return () => {
            container.removeEventListener(
                'scroll',
                handleScroll
            );

            console.log('🧹 Scroll listener удалён');
        };
    }, [
        loading,
        showLoading,
        loadMoreOld,
        loadMoreNew
    ]);

    // ===================== ПЕРВИЧНАЯ ЗАГРУЗКА =====================

    useEffect(() => {
        console.log('🔄 Загрузка чата:', chatId);

        // Сброс флагов при смене чата
        addedIdsRef.current.clear();
        hasScrolledRef.current = false;
        isInitialScrollDone.current = false;
        startMessageIdRef.current = null;
        oldestMessageIdRef.current = null;
        newestMessageIdRef.current = null;
        hasMoreOldRef.current = true;
        hasMoreNewRef.current = true;
        loadingMoreOldRef.current = false;
        loadingMoreNewRef.current = false;
        setMessages([]);
        setImageUrls({});

        loadChat();
    }, [chatId]);

    const loadChat = async () => {
        const currentChatId = chatId;
        setLoading(true);

        try {
            const chatRes = await chatsApi.getById(currentChatId);
            if (currentChatId !== chatId) return;
            setChat(chatRes.data);

            let startId = lastReadMap[currentChatId] || null;

            if (!startId) {
                try {
                    const unreadRes = await messagesApi.getFirstUnread(currentChatId);
                    if (currentChatId !== chatId) return;
                    if (unreadRes.data?.messageId) startId = unreadRes.data.messageId;
                } catch (err) { /* ignore */ }
            }

            if (!startId) {
                try {
                    const lastRes = await messagesApi.getByChat(currentChatId, 0, 1);
                    if (currentChatId !== chatId) return;
                    if (lastRes.data[0]) startId = lastRes.data[0].id;
                } catch (err) { /* ignore */ }
            }

            if (startId) {
                await loadMessagesAround(startId, currentChatId);
            } else {
                setMessages([]);
                setImageUrls({});
                hasMoreOldRef.current = false;
                hasMoreNewRef.current = false;
                isInitialScrollDone.current = true;
            }
        } catch (err) {
            if (currentChatId !== chatId) return;
            console.error(err);
            if (err.response?.status === 404 || err.response?.status === 403) {
                navigate('/chats', { replace: true });
                return;
            }
            setMessages([]);
            setChat(null);
            isInitialScrollDone.current = true;
        } finally {
            if (currentChatId === chatId) setLoading(false);
        }
    };

    // Управление задержкой показа загрузки
    useEffect(() => {
        let timer;
        if (loading) {
            timer = setTimeout(() => setShowLoading(true), 200);
        } else {
            setShowLoading(false);
        }
        return () => clearTimeout(timer);
    }, [loading]);

    // ===================== ПРОКРУТКА ПОСЛЕ ЗАГРУЗКИ =====================

    useLayoutEffect(() => {
        if (
            loading ||
            showLoading ||
            messages.length === 0 ||
            hasScrolledRef.current
        ) {
            return;
        }

        const initialMessageId = startMessageIdRef.current;

        const scrollInitial = () => {
            if (initialMessageId) {
                scrollToMessage(initialMessageId, 'auto');
            } else {
                scrollToBottom('auto');
            }

            requestAnimationFrame(() => {
                // Повторная прокрутка для надежности
                if (initialMessageId) {
                    scrollToMessage(initialMessageId, 'auto');
                } else {
                    scrollToBottom('auto');
                }

                hasScrolledRef.current = true;
                isInitialScrollDone.current = true;

                console.log('✅ Initial scroll завершен');
            });
        };

        requestAnimationFrame(scrollInitial);
    }, [
        loading,
        showLoading,
        messages,
        scrollToBottom,
        scrollToMessage
    ]);

    // ===================== ЧТЕНИЕ СООБЩЕНИЙ =====================

    const markMessagesAsread = useCallback(async (messageIds) => {
        if (!messageIds || messageIds.length === 0) return;

        const newIds = messageIds.filter(id => !observedMessageIds.has(id));
        if (newIds.length === 0) return;

        try {
            await messagesApi.markBatchAsRead(chatId, newIds);
            setObservedMessageIds(prev => new Set([...prev, ...newIds]));
        } catch (err) {
            console.error('Ошибка отметки прочитанных:', err);
        }
    }, [chatId, observedMessageIds]);

    useEffect(() => {
        if (pendingReadIds.length === 0) return;

        clearTimeout(readTimeoutRef.current);
        readTimeoutRef.current = setTimeout(() => {
            const idsToSend = [...pendingReadIds];
            setPendingReadIds([]);
            markMessagesAsread(idsToSend);
        }, 500);
        return () => clearTimeout(readTimeoutRef.current);
    }, [pendingReadIds, markMessagesAsread]);

    const handleMessageVisibility = useCallback((entries) => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        if (visibleEntries.length === 0) return;

        const visibleIds = visibleEntries
            .map(entry => entry.target.dataset.messageId)
            .filter(id => id);

        setPendingReadIds(prev => [
            ...new Set([
                ...prev,
                ...visibleIds
            ])
        ]);

        const sorted = visibleEntries.sort((a, b) => {
            const rectA = a.target.getBoundingClientRect();
            const rectB = b.target.getBoundingClientRect();
            return rectA.top - rectB.top;
        });

        const lastVisible = sorted[sorted.length - 1];
        const lastVisibleId = lastVisible.target.dataset.messageId;

        if (lastVisibleId) {
            setLastReadMap(prev => ({
                ...prev,
                [chatId]: lastVisibleId
            }));
        }
    }, [chatId, setLastReadMap, setPendingReadIds]);

    useEffect(() => {
        if (loading || showLoading) return;

        const container = messageListRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(handleMessageVisibility, {
            root: container,
            rootMargin: '0px 0px 0px 0px',
            threshold: 0.3,
        });

        const observeAllMessages = () => {
            container.querySelectorAll('[data-message-id]').forEach(el => observer.observe(el));
        };

        observeAllMessages();

        const mutationObserver = new MutationObserver(() => {
            observeAllMessages();
        });

        mutationObserver.observe(container, {
            childList: true,
            subtree: true
        });

        return () => {
            observer.disconnect();
            mutationObserver.disconnect();
        };
    }, [
        loading,
        showLoading,
        messages,
        handleMessageVisibility
    ]);

    // ===================== ОБНОВЛЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ =====================

    useEffect(() => {
        if (!updatedUser) return;

        console.log('🔄 Обновляем пользователя в сообщениях:', updatedUser);

        if (chat && !chat.isGroup && updatedUser.userId !== user?.id) {
            setChat(prev => ({
                ...prev,
                name: updatedUser.name,
                avatarUrl: updatedUser.avatarUrl
            }));

            updateChat({
                ...chat,
                name: updatedUser.name,
                avatarUrl: updatedUser.avatarUrl
            });
        }

        setMessages(prevMessages =>
            prevMessages.map(message => {
                if (String(message.senderId) !== String(updatedUser.userId)) {
                    return message;
                }
                return {
                    ...message,
                    senderName: updatedUser.name,
                    senderAvatarUrl: updatedUser.avatarUrl
                };
            })
        );
    }, [updatedUser]);

    // ===================== ПОДКЛЮЧЕНИЕ К SIGNALR =====================

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const setupSignalR = async () => {
            try {
                if (!connectionRef.current) {
                    connectionRef.current = await startChatConnection(token);
                    connectionRef.current.onclose(() => {
                        console.log('SignalR connection closed');
                    });
                }

                const connection = connectionRef.current;
                if (!connection) return;

                if (receiveHandlerRef.current) {
                    connection.off('ReceiveMessage', receiveHandlerRef.current);
                    receiveHandlerRef.current = null;
                }

                if (
                    currentChatIdRef.current &&
                    currentChatIdRef.current !== chatId
                ) {
                    await connection
                        .invoke('LeaveGroup', currentChatIdRef.current)
                        .catch(err =>
                            console.warn(
                                'LeaveGroup error:',
                                err
                            )
                        );
                }

                const handleReceiveMessage = (newMessage) => {
                    if (addedIdsRef.current.has(newMessage.id)) return;

                    addedIdsRef.current.add(newMessage.id);

                    setMessages((prev) => {
                        if (
                            prev.some(
                                msg => msg.id === newMessage.id
                            )
                        ) {
                            return prev;
                        }

                        return [
                            ...prev,
                            newMessage
                        ];
                    });

                    if (isNearBottom()) {
                        setTimeout(
                            () =>
                                scrollToBottom('smooth'),
                            100
                        );
                    }
                };

                receiveHandlerRef.current = handleReceiveMessage;
                connection.on(
                    'ReceiveMessage',
                    handleReceiveMessage
                );

                connection.on(
                    'MessageRead',
                    (data) => {
                        console.log(
                            '📖 Сообщения прочитаны:',
                            data
                        );

                        if (data.chatId !== chatId) return;

                        setMessages(prev =>
                            prev.map(msg => {
                                if (
                                    data.messageIds.includes(
                                        msg.id
                                    )
                                ) {
                                    const alreadyRead =
                                        msg.readBy?.some(
                                            r =>
                                                r.id ===
                                                data.reader.id
                                        );

                                    if (alreadyRead) {
                                        return msg;
                                    }

                                    return {
                                        ...msg,
                                        readBy: [
                                            ...(msg.readBy || []),
                                            data.reader
                                        ]
                                    };
                                }

                                return msg;
                            })
                        );
                    }
                );

                connection.on(
                    'MessageEdited',
                    (editedMessage) => {
                        console.log(
                            '✏️ Сообщение отредактировано:',
                            editedMessage
                        );

                        setMessages(prev =>
                            prev.map(msg =>
                                msg.id === editedMessage.id
                                    ? {
                                        ...msg,
                                        text: editedMessage.text,
                                        isEdited: true
                                    }
                                    : msg
                            )
                        );
                    }
                );

                connection.on(
                    'MessageDeleted',
                    (data) => {
                        console.log(
                            '🗑️ Сообщение удалено:',
                            data
                        );

                        setMessages(prev =>
                            prev.filter(
                                msg =>
                                    msg.id !==
                                    data.messageId
                            )
                        );
                    }
                );

                connection.on(
                    'GroupUpdated',
                    (updatedChat) => {
                        if (
                            updatedChat.id === chatId
                        ) {
                            setChat(updatedChat);
                            updateChat(updatedChat);
                        }
                    }
                );

                connection.on(
                    'UserUpdated',
                    (data) => {
                        console.log(
                            '🔥 UserUpdated received in Chat'
                        );

                        if (
                            chat &&
                            !chat.isGroup &&
                            data.userId !== user?.id
                        ) {
                            setChat(prev => ({
                                ...prev,
                                name: data.name,
                                avatarUrl:
                                    data.avatarUrl
                            }));

                            updateChat({
                                ...chat,
                                name: data.name,
                                avatarUrl:
                                    data.avatarUrl
                            });
                        }

                        setMessages(prevMessages =>
                            prevMessages.map(message => {
                                if (
                                    String(
                                        message.senderId
                                    ) !==
                                    String(data.userId)
                                ) {
                                    return message;
                                }

                                return {
                                    ...message,
                                    senderName: data.name,
                                    senderAvatarUrl:
                                        data.avatarUrl
                                };
                            })
                        );
                    }
                );

                await connection
                    .invoke('JoinGroup', chatId)
                    .catch(err =>
                        console.warn(
                            'JoinGroup error:',
                            err
                        )
                    );

                currentChatIdRef.current = chatId;

                console.log(
                    'SignalR connected for chat:',
                    chatId
                );
            } catch (err) {
                console.error(
                    'SignalR setup error:',
                    err
                );
            }
        };

        setupSignalR();

        return () => {
            const connection = connectionRef.current;

            if (connection) {
                if (receiveHandlerRef.current) {
                    connection.off(
                        'ReceiveMessage',
                        receiveHandlerRef.current
                    );

                    receiveHandlerRef.current = null;
                }

                connection.off('MessageRead');
                connection.off('MessageEdited');
                connection.off('MessageDeleted');
                connection.off('GroupUpdated');
                connection.off('UserUpdated');

                if (currentChatIdRef.current) {
                    connection
                        .invoke(
                            'LeaveGroup',
                            currentChatIdRef.current
                        )
                        .catch(err =>
                            console.warn(
                                'LeaveGroup cleanup error:',
                                err
                            )
                        );

                    currentChatIdRef.current = null;
                }
            }
        };
    }, [chatId, chat, user]);

    // ===================== РЕНДЕР =====================

    if (showLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Загрузка...</p>
            </div>
        );
    }

    if (loading) return null;

    return (
        <div className="chat-container">
            <div
                className="chat-header"
                onClick={handleHeaderClick}
                style={{ cursor: 'pointer' }}
            >
                <div className="chat-header-avatar">
                    <NullAvatar
                        name={chat.name}
                        picture={avatarBlob}
                        size={50}
                    />
                </div>

                <div className="chat-header-info">
                    <div className="chat-title">
                        {chat.name}
                    </div>

                    <div className="chat-status">
                        {chat.isGroup
                            ? `Участников: ${chat.membersCount}`
                            : 'Личный чат'}
                    </div>
                </div>
            </div>

            <div
                className="message-list-wrapper"
                ref={messageListRef}
            >
                <MessageList
                    messages={messages}
                    currentUserId={user?.id}
                    imageUrls={imageUrls}
                    onContextMenu={openContextMenu}
                />
            </div>

            <div className="message-input-wrapper">
                <MessageInput onSend={handleSend} />
            </div>

            {contextMenu && (
                <MessageContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    message={contextMenu.message}
                    isOwn={
                        contextMenu.message.senderId ===
                        user?.id
                    }
                    onClose={closeContextMenu}
                    onCopy={() =>
                        handleCopyText(
                            contextMenu.message
                        )
                    }
                    onEdit={() =>
                        handleEditMessage(
                            contextMenu.message
                        )
                    }
                    onDelete={() =>
                        handleDeleteMessage(
                            contextMenu.message
                        )
                    }
                />
            )}

            {messageModal && (
                <MessageActionModal
                    type={messageModal.type}
                    message={messageModal.message}
                    onClose={closeMessageModal}
                    onConfirm={handleMessageModalConfirm}
                />
            )}
        </div>
    );
};

export default Chat;