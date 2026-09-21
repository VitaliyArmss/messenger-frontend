// components/CreateGroupChat.jsx
import { useState, useEffect, useRef } from 'react';
import { usersApi } from '../api/users';
import { chatsApi } from '../api/chats';
import NullAvatar from './NullAvatar'; // для предпросмотра
import '../css/index.css';

const CreateGroupChat = ({ onCancel, onChatCreated, user }) => {
    const [groupName, setGroupName] = useState('');
    const [contacts, setContacts] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Состояния для аватара
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const loadContacts = async () => {
            try {
                setLoading(true);
                const res = await usersApi.getContacts();
                setContacts(res.data);
            } catch (err) {
                console.error('Ошибка загрузки контактов:', err);
            } finally {
                setLoading(false);
            }
        };
        loadContacts();
    }, []);

    const toggleSelect = (userId) => {
        setSelectedIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // Обработчик выбора файла
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);
        // Сброс input, чтобы можно было выбрать тот же файл повторно
        e.target.value = '';
    };

    // Очистка выбранного аватара
    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCreate = async () => {
        if (!groupName.trim()) {
            alert('Введите название группы');
            return;
        }
        if (selectedIds.length === 0) {
            alert('Выберите хотя бы одного участника');
            return;
        }
        setSubmitting(true);
        try {
            const memberIds = [user.id, ...selectedIds];
            // 1. Создаём группу без аватара
            const response = await chatsApi.create({
                isGroup: true,
                name: groupName.trim(),
                memberIds: memberIds
            });
            const newChat = response.data;

            // 2. Если выбран аватар – загружаем его через updateGroup
            if (avatarFile) {
                const formData = new FormData();
                formData.append('AvatarFile', avatarFile);
                // Обновляем группу, передавая FormData
                await chatsApi.updateGroup(newChat.id, formData);
                // Получаем обновлённые данные чата (чтобы avatarUrl был в ответе)
                const updated = await chatsApi.getById(newChat.id);
                onChatCreated(updated.data);
            } else {
                onChatCreated(newChat);
            }
        } catch (err) {
            console.error('Ошибка создания группы:', err);
            alert('Не удалось создать группу');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="create-group-loading">Загрузка контактов...</div>;

    return (
        <div className="create-group-container">
            <div className="create-group-header">
                <button className="create-group-cancel" onClick={onCancel}>Отмена</button>
                <span className="create-group-title">Создать группу</span>
            </div>

            {/* Аватар – теперь кликабельный */}
            <div className="create-group-avatar">
                <div
                    className="avatar-placeholder"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ cursor: 'pointer' }}
                >
                    {avatarPreview ? (
                        <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '50%'
                            }}
                        />
                    ) : (
                        <span style={{ fontSize: '32px' }}>📷</span>
                    )}
                </div>
                {avatarPreview && (
                    <button
                        type="button"
                        className="remove-avatar-btn"
                        onClick={handleRemoveAvatar}
                        style={{
                            marginTop: '6px',
                            background: 'transparent',
                            color: 'var(--danger)',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        ✕ Удалить
                    </button>
                )}
                <span className="avatar-hint">Нажмите, чтобы загрузить</span>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Название группы */}
            <input
                type="text"
                className="create-group-name-input"
                placeholder="Название группы"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={40}
            />

            {/* Список контактов */}
            <div className="create-group-contacts">
                <h4>Выберите участников</h4>
                <div className="contacts-scroll">
                    {contacts.length === 0 ? (
                        <p className="no-contacts">Нет доступных контактов</p>
                    ) : (
                        contacts.map(contact => (
                            <label key={contact.id} className="contact-item">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(contact.id)}
                                    onChange={() => toggleSelect(contact.id)}
                                />
                                <span className="contact-name">{contact.name}</span>
                            </label>
                        ))
                    )}
                </div>
            </div>

            <button
                className="create-group-submit"
                onClick={handleCreate}
                disabled={submitting || !groupName.trim() || selectedIds.length === 0}
            >
                {submitting ? 'Создаётся...' : 'Создать'}
            </button>
        </div>
    );
};

export default CreateGroupChat;