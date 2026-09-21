// pages/Chats.jsx
import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

import { chatsApi } from '../api/chats';
import { startNotificationConnection, getNotificationConnection } from '../api/signalr';

import { useAuth } from '../context/AuthContext';
import { useAvatar } from '../hooks/useAvatar';

import AboutChat from '../components/AboutChat';
import ChatList from '../components/ChatList';
import NullAvatar from '../components/NullAvatar';
import SearchBar from '../components/SearchBar';
import SearchList from '../components/SearchList';
import AboutProfile from '../components/AboutProfile';
import CreateGroupChat from '../components/CreateGroupChat';
import AddGroupMembers from '../components/AddGroupMembers';

import { useNotificationSound } from '../hooks/useNotificationSound';

import '../css/index.css';

const sortChatsByLastMessage = (chats) => {
    return [...chats].sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
    });
};

const Chats = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const location = useLocation();
    const isMountedRef = useRef(true);
    const userAvatar = useAvatar(user?.avatarUrl);

    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [curChat, setCurChat] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastReadMap, setLastReadMap] = useState({});
    const [updatedUser, setUpdatedUser] = useState(null);

    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [isAddingMembers, setIsAddingMembers] = useState(false);
    const [addMembersChatId, setAddMembersChatId] = useState(null);
    const [showThirdColumn, setShowThirdColumn] = useState(false);
    const [rightPanelMode, setRightPanelMode] = useState('chat');

    const blurTimerRef = useRef(null);

    // НОВОЕ: Хук для звука и определение текущего чата
    const playNotificationSound = useNotificationSound();

    // Получаем текущий chatId из URL
    const currentChatIdFromUrl = location.pathname.match(/\/chats\/([^/]+)/)?.[1] || null;

    // НОВОЕ: Определяем, открыт ли чат в данный момент
    const isChatOpen = (chatId) => {
        return currentChatIdFromUrl === chatId;
    };

    // ===================== УПРАВЛЕНИЕ ТРЕТЬЕЙ КОЛОНКОЙ =====================
    const openThirdColumn = () => setShowThirdColumn(true);
    const closeThirdColumn = () => {
        setShowThirdColumn(false);
        setRightPanelMode('chat');
    };

    const handleOpenChatInfo = async (chatId) => {
        if (!curChat || curChat.id !== chatId) {
            await chooseChat(chatId);
        }
        setRightPanelMode('chat');
        openThirdColumn();
    };

    const handleOpenProfileInfo = () => {
        setRightPanelMode('profile');
        openThirdColumn();
    };

    // ===================== СОЗДАНИЕ ГРУППЫ =====================
    const handleCreateGroupCancel = () => setIsCreatingGroup(false);

    const handleGroupCreated = (newChat) => {
        //setChats(prev => sortChatsByLastMessage([newChat, ...prev]));
        setIsCreatingGroup(false);
        setCurChat(newChat);
        navigate(`/chats/${newChat.id}`);
    };

    // ===================== ДОБАВЛЕНИЕ УЧАСТНИКОВ =====================
    const openAddMembers = (chatId) => {
        setAddMembersChatId(chatId);
        setIsAddingMembers(true);
    };

    const handleAddMembersCancel = () => {
        setIsAddingMembers(false);
        setAddMembersChatId(null);
    };

    const handleMembersAdded = () => {
        // Обновляем текущий чат, чтобы обновить количество участников
        if (curChat) {
            chatsApi.getById(curChat.id)
                .then(res => {
                    setCurChat(res.data);
                    setChats(prev => prev.map(c => c.id === res.data.id ? res.data : c));
                })
                .catch(console.error);
        }
        setIsAddingMembers(false);
        setAddMembersChatId(null);
    };

    const handleSearchBlur = () => {
        // Не скрываем сразу, а через 200 мс
        blurTimerRef.current = setTimeout(() => {
            setIsSearchFocused(false);
        }, 200);
    };

    // ===================== ОБНОВЛЕНИЕ ЧАТА =====================
    const updateChat = (updatedChat) => {
        setCurChat(updatedChat);
        setChats(prev => prev.map(c => c.id === updatedChat.id ? updatedChat : c));
    };

    // ===================== НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ЧАТОВ =====================
    const chooseChat = async (chatId) => {
        try {
            const res = await chatsApi.getById(chatId);
            setCurChat(res.data);
        } catch (err) {
            console.error('Ошибка загрузки чата:', err);
        }
    };

    const switchToNewChat = async (userId) => {
        if (!userId) return;
        const oldChat = curChat;

        try {
            const res = await chatsApi.getByUserId(userId);
            let newChat = res.data;

            if (!newChat) {
                const createRes = await chatsApi.create({
                    isGroup: false,
                    initialised: false,
                    memberIds: [user.id, userId]
                });
                newChat = createRes.data;
                //setChats(prev => sortChatsByLastMessage([newChat, ...prev]));
            }

            setCurChat(newChat);
            navigate(`/chats/${newChat.id}`);

            if (oldChat && oldChat.id !== newChat.id && !oldChat.lastMessageText && !oldChat.lastMessageAt) {
                await chatsApi.delete(oldChat.id);
                setChats(prev => prev.filter(c => c.id !== oldChat.id));
            }
        } catch (err) {
            console.error('Ошибка переключения чата:', err);
            if (err.response?.status === 404) {
                try {
                    const createRes = await chatsApi.create({
                        isGroup: false,
                        memberIds: [user.id, userId]
                    });
                    const newChat = createRes.data;
                    setChats(prev => sortChatsByLastMessage([newChat, ...prev]));
                    setCurChat(newChat);
                    navigate(`/chats/${newChat.id}`);
                } catch (createErr) {
                    console.error('Ошибка создания чата:', createErr);
                }
            }
        }
    };

    // ===================== ЗАГРУЗКА СПИСКА ЧАТОВ =====================

    const loadChats = async () => {
        try {
            const res = await chatsApi.getAll();
            setChats(sortChatsByLastMessage(res.data));
        } catch (err) {
            console.error('Ошибка загрузки чатов:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadChats();
    }, []);

    // ===================== ПОДКЛЮЧЕНИЕ К NOTIFICATIONHUB =====================
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        isMountedRef.current = true;

        const setupNotificationHub = async () => {
            try {
                const conn = await startNotificationConnection(token);

                conn.off('ReceiveNotification');
                conn.off('UpdateUnreadCount');
                conn.off('ChatsUpdated');
                conn.off('ExcludedFromChat');
                conn.off('GroupDeleted');
                conn.off('GroupCreated');
                conn.off('UserUpdated');

                conn.on('ReceiveNotification', (data) => {
                    console.log('📩 Получено уведомление:', data);
                    if (!isMountedRef.current) return;

                    // НОВОЕ: Проверяем, открыт ли этот чат
                    const isCurrentChatOpen = isChatOpen(data.chatId);

                    // Если чат НЕ открыт - воспроизводим звук
                    if (!isCurrentChatOpen) {
                        console.log('🔔 Уведомление из чата', data.chatId, '- воспроизводим звук');
                        playNotificationSound();
                    } else {
                        console.log('🔇 Чат', data.chatId, 'открыт - звук не воспроизводим');
                    }

                    setChats(prevChats => {
                        const updated = prevChats.map(chat =>
                            chat.id === data.chatId
                                ? {
                                    ...chat,
                                    lastMessageText: data.lastMessageText,
                                    lastMessageAt: data.lastMessageAt,
                                    unreadMessagesCount: data.unreadCount
                                }
                                : chat
                        );
                        return sortChatsByLastMessage(updated);
                    });
                });

                conn.on('UpdateUnreadCount', (data) => {
                    console.log('📊 Обновление счётчика непрочитанных:', data);
                    if (!isMountedRef.current) return;

                    setChats(prevChats => {
                        const updated = prevChats.map(chat =>
                            chat.id === data.chatId
                                ? { ...chat, unreadMessagesCount: data.unreadCount }
                                : chat
                        );
                        return sortChatsByLastMessage(updated);
                    });
                });

                conn.on('ChatsUpdated', async (data) => {
                    console.log('🔄 Обновление данных чата:', data);

                    if (!isMountedRef.current || !data.chatId) return;

                    try {
                        const response = await chatsApi.getById(data.chatId);
                        const updatedChat = response.data;

                        setChats(prevChats => {
                            const chatExists = prevChats.some(
                                chat => chat.id === updatedChat.id
                            );

                            const updatedChats = chatExists
                                ? prevChats.map(chat =>
                                    chat.id === updatedChat.id
                                        ? updatedChat
                                        : chat
                                )
                                : [...prevChats, updatedChat];

                            return sortChatsByLastMessage(updatedChats);
                        });

                        setCurChat(prevChat =>
                            prevChat?.id === updatedChat.id
                                ? updatedChat
                                : prevChat
                        );
                    } catch (err) {
                        console.error('Ошибка обновления чата:', err);

                        // Если пользователь действительно больше не участник,
                        // отдельное событие ExcludedFromChat обработает выход из чата.
                        if (
                            err.response?.status === 403 ||
                            err.response?.status === 404
                        ) {
                            setChats(prevChats =>
                                prevChats.filter(chat => chat.id !== data.chatId)
                            );
                        }
                    }
                });

                conn.on('ExcludedFromChat', (data) => {
                    console.log('🚫 Вы исключены из чата:', data);
                    // Аналогично закрываем панель
                    setCurChat(prevChat => {
                        if (prevChat?.id === data.chatId) {
                            setShowThirdColumn(false);
                            setRightPanelMode('chat');
                            navigate('/chats', { replace: true });
                            return null;
                        }
                        return prevChat;
                    });
                });

                conn.on('GroupDeleted', (data) => {
                    console.log('🗑️ Группа удалена:', data);

                    // Удаляем чат из списка
                    setChats(prevChats => prevChats.filter(chat => chat.id !== data.chatId));

                    // Закрываем панель и перенаправляем, если этот чат был открыт
                    setCurChat(prevChat => {
                        if (prevChat?.id === data.chatId) {
                            setShowThirdColumn(false);
                            setRightPanelMode('chat');
                            navigate('/chats', { replace: true });
                            return null;
                        }
                        return prevChat;
                    });
                });

                conn.on('GroupCreated', (chat) => {
                    console.log('🆕 Создана новая группа/чат:', chat);
                    setChats(prevChats => {
                        if (prevChats.some(c => c.id === chat.id)) {
                            return prevChats;
                        }
                        return sortChatsByLastMessage([chat, ...prevChats]);
                    });
                });

                conn.on('UserUpdated', (data) => {
                    console.log('👤 User updated:', data);

                    if (!isMountedRef.current) return;

                    // 🔥 Передаём обновление в открытый Chat.jsx
                    setUpdatedUser(data);

                    setChats(prevChats =>
                        prevChats.map(chat => {
                            // Пока обновляем только личные чаты
                            if (chat.isGroup) {
                                return chat;
                            }

                            // ВАЖНО:
                            // нужен userId собеседника в объекте chat
                            if (chat.userId !== data.userId) {
                                return chat;
                            }

                            return {
                                ...chat,
                                name: data.name,
                                userName: data.userName,
                                avatarUrl: data.avatarUrl
                            };
                        })
                    );

                    // Если этот пользователь сейчас открыт
                    setCurChat(prevChat => {
                        if (
                            prevChat &&
                            !prevChat.isGroup &&
                            prevChat.userId === data.userId
                        ) {
                            return {
                                ...prevChat,
                                name: data.name,
                                userName: data.userName,
                                avatarUrl: data.avatarUrl
                            };
                        }

                        return prevChat;
                    });
                });

                console.log('✅ NotificationHub connected and handlers registered');
            } catch (err) {
                console.error('❌ NotificationHub connection error:', err);
            }
        };

        setupNotificationHub();

        return () => {
            isMountedRef.current = false;
            const conn = getNotificationConnection();
            if (conn) {
                conn.off('ReceiveNotification');
                conn.off('UpdateUnreadCount');
                conn.off('ChatsUpdated');
                conn.off('ExcludedFromChat');
                conn.off('GroupDeleted');
                conn.off('GroupCreated');
                conn.off('UserUpdated');
            }
        };
    }, [currentChatIdFromUrl]);

    useEffect(() => {
        const unreadCount = chats.reduce(
            (total, chat) => total + (chat.unreadMessagesCount || 0),
            0
        );

        document.title = unreadCount > 0
            ? `(${unreadCount}) Messenger`
            : 'Messenger';

        return () => {
            document.title = 'Messenger';
        };
    }, [chats]);

    if (loading) return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p>Загрузка...</p>
        </div>)

    return (
        <div className={`container ${showThirdColumn ? 'three-columns' : ''}`}>
            {/* Левая колонка */}
            <div className="column left-column">
                <div className="header">
                    <div>
                        <NullAvatar
                            name={user.name}
                            picture={userAvatar}
                            size={40}
                            onClick={handleOpenProfileInfo}
                            style={{ cursor: 'pointer' }}
                        />
                        <SearchBar onSearch={setSearchQuery} onFocus={() => setIsSearchFocused(true)} onBlur={handleSearchBlur} />
                        <button className="create-group-btn" onClick={() => setIsCreatingGroup(true)} title="Создать группу">
                            <span className="plus-icon">+</span>
                        </button>
                    </div>
                </div>
                {isAddingMembers ? (
                    <AddGroupMembers
                        chatId={addMembersChatId}
                        chatName={curChat?.name || 'Группа'}
                        onCancel={handleAddMembersCancel}
                        onMemberAdded={handleMembersAdded}
                    />
                ) : isCreatingGroup ? (
                    <CreateGroupChat
                        onCancel={handleCreateGroupCancel}
                        onChatCreated={handleGroupCreated}
                        user={user}
                    />
                ) : isSearchFocused ? (
                    <SearchList searchValue={searchQuery} openChat={switchToNewChat} />
                ) : (
                    <div className="chat-list-wrapper">
                        <ChatList chats={chats} user={user} onChatSelect={chooseChat} />
                    </div>

                )}
                <footer className="chats-footer">
                    <a href="/privacy">
                        Политика конфиденциальности
                    </a>
                </footer>
            </div>

            {/* Центральная колонка */}
            <div className="column center-column">
                <Outlet context={{
                    openChatInfo: handleOpenChatInfo,
                    lastReadMap,
                    setLastReadMap,
                    updateChat,
                    openAddMembers, // передаём функцию для вызова из AboutChat
                    updatedUser
                }} />
            </div>

            {/* Правая колонка */}
            {showThirdColumn && (
                rightPanelMode === 'chat' ? (
                    <AboutChat
                        key={curChat?.id}  // ← добавляем key
                        chatInfo={curChat}
                        chatName={curChat?.name}
                        switchChat={switchToNewChat}
                        onClose={closeThirdColumn}
                        onOpenAddMembers={openAddMembers}
                    />
                ) : (
                    <AboutProfile onClose={closeThirdColumn} />
                )
            )}
        </div>
    );
};

export default Chats;