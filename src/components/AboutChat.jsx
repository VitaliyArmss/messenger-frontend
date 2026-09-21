// AboutChat.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAvatar } from '../hooks/useAvatar';
import { chatsApi } from '../api/chats';
import { attachmentsApi } from '../api/attachments';
import { getchatConnection } from '../api/signalr';
import NullAvatar from '../components/NullAvatar';
import ChatTabs from '../components/FileTabs';
import '../css/index.css';

const AboutChat = ({ chatInfo, chatName, switchChat, onClose, onOpenAddMembers }) => {
    const { user } = useAuth();
    const [chatData, setChatData] = useState(chatInfo);
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(chatInfo?.name || '');
    const [avatarPreview, setAvatarPreview] = useState(null);
    const avatarBlob = useAvatar(chatInfo?.avatarUrl);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const isOwner = user?.id === chatData?.ownerId;

    // Обновляем состояние при изменении chatInfo извне
    useEffect(() => {
        setChatData(chatInfo);
        setNewName(chatInfo?.name || '');
    }, [chatInfo]);

    // Загружаем аватар через axios, чтобы Authorization попал в запрос
    useEffect(() => {
        let objectUrl = null;

        const loadAvatar = async () => {
            if (!chatInfo?.avatarUrl) {
                setAvatarPreview(null);
                return;
            }

            try {
                objectUrl = await attachmentsApi.getImageUrl(chatInfo.avatarUrl);
                setAvatarPreview(objectUrl);
            } catch (err) {
                console.error('Ошибка загрузки аватара', err);
                setAvatarPreview(null);
            }
        };

        loadAvatar();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [chatInfo?.avatarUrl]);

    // Загрузка участников
    useEffect(() => {
        const loadMembers = async () => {
            if (!chatData?.id) return;
            setLoadingMembers(true);

            try {
                const res = await chatsApi.getMembers(chatData.id);
                setMembers(res.data);
            } catch (err) {
                console.error('Ошибка загрузки участников', err);
            } finally {
                setLoadingMembers(false);
            }
        };

        loadMembers();
    }, [chatData?.id]);

    // Подписка на обновления через SignalR
    useEffect(() => {
        const connection = getchatConnection();
        if (!connection) return;

        const handleMembersUpdated = (newMembers) => {
            setMembers(newMembers);
        };

        const handleGroupUpdated = (updatedChat) => {
            if (updatedChat.id === chatData?.id) {
                setChatData(updatedChat);
                setNewName(updatedChat.name || '');
            }
        };

        connection.on('GroupMembersUpdated', handleMembersUpdated);
        connection.on('GroupUpdated', handleGroupUpdated);

        return () => {
            connection.off('GroupMembersUpdated', handleMembersUpdated);
            connection.off('GroupUpdated', handleGroupUpdated);
        };
    }, [chatData?.id]);

    // Редактирование названия
    const handleEditName = () => {
        setNewName(chatData?.name || '');
        setIsEditingName(true);
    };

    const handleSaveName = async () => {
        if (!newName.trim()) return;

        const formData = new FormData();
        formData.append('Name', newName.trim());

        try {
            await chatsApi.updateGroup(chatData.id, formData);
            setIsEditingName(false);
        } catch (err) {
            console.error('Ошибка обновления названия', err);
        }
    };

    // Аватар – сразу загружаем при выборе файла
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Локальный preview сразу после выбора файла
        const localUrl = URL.createObjectURL(file);
        setAvatarPreview(localUrl);

        const formData = new FormData();
        formData.append('AvatarFile', file);

        try {
            const res = await chatsApi.updateGroup(chatData.id, formData);

            // Backend возвращает обновлённый ChatResponse
            if (res.data?.avatarUrl) {
                const serverUrl = await attachmentsApi.getImageUrl(
                    res.data.avatarUrl
                );

                URL.revokeObjectURL(localUrl);
                setAvatarPreview(serverUrl);
                setChatData(res.data);
            }
        } catch (err) {
            console.error('Ошибка загрузки аватара', err);

            URL.revokeObjectURL(localUrl);

            // Возвращаем старый аватар через backend
            if (chatData?.avatarUrl) {
                try {
                    const oldUrl = await attachmentsApi.getImageUrl(
                        chatData.avatarUrl
                    );
                    setAvatarPreview(oldUrl);
                } catch {
                    setAvatarPreview(null);
                }
            } else {
                setAvatarPreview(null);
            }
        }

        // Очищаем input, чтобы можно было выбрать тот же файл повторно
        e.target.value = '';
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Удалить этого участника из группы?')) return;

        try {
            await chatsApi.removeMember(chatData.id, userId);
        } catch (err) {
            console.error('Ошибка удаления участника', err);
        }
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm('Вы уверены, что хотите покинуть группу?')) return;
        try {
            await chatsApi.removeMember(chatData.id, user.id);
            onClose(); // закрыть панель
            navigate('/chats', { replace: true });
        } catch (err) {
            console.error('Ошибка выхода из группы:', err);
            alert('Не удалось покинуть группу');
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить группу? Это действие необратимо.')) return;
        try {
            await chatsApi.delete(chatData.id);
            onClose();
            navigate('/chats', { replace: true });
        } catch (err) {
            console.error('Ошибка удаления группы:', err);
            alert('Не удалось удалить группу');
        }
    };

    // Компонент для отображения аватара участника
    const MemberAvatar = ({ member }) => {
        const avatarBlob = useAvatar(member.avatarUrl);
        return (
            <NullAvatar
                name={member.name}
                picture={avatarBlob}
                size={36}
            />
        );
    };

    if (!chatData) return <div className="loading">Загрузка...</div>;

    return (
        <div className="about-chat-container">
            <div className="about-chat-header">
                <h2>
                    {chatData.isGroup ? 'Информация о группе' : 'Информация о чате'}
                </h2>

                <button className="close-btn" onClick={onClose}>✕</button>
            </div>

            <div className="about-chat-body">
                <div className="chat-avatar-section">
                    <div
                        className={`avatar-wrapper ${isOwner && chatData.isGroup ? 'editable' : ''}`}
                        onClick={
                            isOwner && chatData.isGroup
                                ? () => fileInputRef.current?.click()
                                : undefined
                        }
                    >
                        <NullAvatar
                            name={chatData.isGroup ? chatData.name : chatName}
                            picture={avatarBlob}
                            size={100}
                        />

                        {isOwner && chatData.isGroup && (
                            <div className="avatar-overlay">
                                <span>Изменить</span>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                <div className="chat-info-section">
                    <div className="chat-name-row">
                        <h3>
                            {chatData.isGroup ? chatData.name : chatName}

                            {isOwner && chatData.isGroup && (
                                <button
                                    className="edit-name-btn"
                                    onClick={handleEditName}
                                >
                                    ✎
                                </button>
                            )}
                        </h3>
                    </div>

                    {isEditingName && (
                        <div className="edit-name-modal slide-in">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Новое название"
                                autoFocus
                                maxLength={40}
                            />

                            <div className="edit-name-actions">
                                <button onClick={handleSaveName}>
                                    Сохранить
                                </button>

                                <button onClick={() => setIsEditingName(false)}>
                                    Отмена
                                </button>
                            </div>
                        </div>
                    )}

                    {chatData.isGroup ? (
                        <div className="group-info">
                            <p>
                                <strong>Участников:</strong>{' '}
                                {chatData.membersCount}
                            </p>

                            <p>
                                <strong>Создан:</strong>{' '}
                                {new Date(chatData.createdAt).toLocaleString()}
                            </p>

                            <div className="members-section">
                                <div className="members-header">
                                    <h4>Участники</h4>

                                    {isOwner && (
                                        <button
                                            className="add-member-btn"
                                            onClick={() =>
                                                onOpenAddMembers(chatData.id)
                                            }
                                        >
                                            + Добавить
                                        </button>
                                    )}
                                </div>

                                {loadingMembers && (
                                    <p className="loading-text">Загрузка...</p>
                                )}

                                <ul className="members-list">
                                    {members.map(member => {
                                        const isCurrentUser =
                                            member.id === user?.id;

                                        const canRemove =
                                            isOwner &&
                                            !isCurrentUser &&
                                            member.id !== chatData.ownerId;

                                        return (
                                            <li
                                                key={member.id}
                                                className="member-item"
                                            >
                                                <div
                                                    className={`member-link ${isCurrentUser ? 'current-user' : ''}`}
                                                    onClick={
                                                        isCurrentUser
                                                            ? undefined
                                                            : (e) => {
                                                                e.stopPropagation();
                                                                switchChat(member.id);
                                                            }
                                                    }
                                                    style={
                                                        isCurrentUser
                                                            ? {
                                                                cursor: 'default',
                                                                opacity: 0.6
                                                            }
                                                            : {}
                                                    }
                                                >
                                                    {/* ✅ Используем MemberAvatar с аватаркой */}
                                                    <MemberAvatar member={member} />

                                                    <span className="member-name">
                                                        {member.name}{' '}
                                                        {isCurrentUser && '(Вы)'}
                                                        {member.id === chatData.ownerId &&
                                                            ' (владелец)'}
                                                    </span>

                                                    {canRemove && (
                                                        <button
                                                            className="remove-member-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveMember(member.id);
                                                            }}
                                                            title="Удалить из группы"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                            <div className="group-actions">
                                {isOwner ? (
                                    <button className="delete-group-btn" onClick={handleDeleteGroup}>
                                        Удалить группу
                                    </button>
                                ) : (
                                    <button className="leave-group-btn" onClick={handleLeaveGroup}>
                                        Выйти из группы
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="private-info">
                            <p>
                                <strong>@</strong>{chatData.userName}
                            </p>

                            <p>
                                <strong>Чат создан:</strong>{' '}
                                {new Date(chatData.createdAt).toLocaleString()}
                            </p>
                        </div>
                    )}
                </div>

                <div className="chat-tabs-section">
                    <ChatTabs chatId={chatData.id} />
                </div>
            </div>
        </div>
    );
};

export default AboutChat;