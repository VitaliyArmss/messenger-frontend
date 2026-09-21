// components/AddGroupMembers.jsx
import { useState, useEffect } from 'react';
import { usersApi } from '../api/users';
import { chatsApi } from '../api/chats';
import NullAvatar from './NullAvatar';
import SenderAvatar from './SenderAvatar';
import '../css/index.css';

const AddGroupMembers = ({ chatId, chatName, onCancel, onMemberAdded }) => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [existingIds, setExistingIds] = useState(new Set());

    // Загружаем контакты и существующих участников чата
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Получаем контакты (пользователи, с которыми есть личные чаты)
                const contactsRes = await usersApi.getContacts();
                // 2. Получаем текущих участников группы
                const membersRes = await chatsApi.getMembers(chatId);
                const existing = new Set(membersRes.data.map(m => m.id));
                setExistingIds(existing);
                // 3. Фильтруем контакты – исключаем уже состоящих в группе
                const available = contactsRes.data.filter(c => !existing.has(c.id));
                setContacts(available);
            } catch (err) {
                console.error('Ошибка загрузки данных', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [chatId]);

    const toggleSelect = (userId) => {
        setSelectedIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleAdd = async () => {
        if (selectedIds.length === 0) {
            alert('Выберите хотя бы одного пользователя');
            return;
        }
        setSubmitting(true);
        try {
            for (const userId of selectedIds) {
                await chatsApi.addMember(chatId, userId);
            }
            onMemberAdded();
            onCancel();
        } catch (err) {
            console.error('Ошибка добавления участников', err);
            alert('Не удалось добавить участников');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="add-members-loading">Загрузка...</div>;

    return (
        <div className="add-members-container">
            <div className="add-members-header">
                <button className="add-members-cancel" onClick={onCancel}>Отмена</button>
                <span className="add-members-title">Добавить участников</span>
                <span className="add-members-chat">{chatName}</span>
            </div>

            <div className="add-members-list">
                {contacts.length === 0 ? (
                    <p className="no-results">Нет доступных контактов для добавления</p>
                ) : (
                    contacts.map(user => (
                        <label key={user.id} className="member-item">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(user.id)}
                                onChange={() => toggleSelect(user.id)}
                            />
                            <SenderAvatar
                                avatarUrl={user.avatarUrl}
                                name={user.name}
                                size={32}
                            />
                            <span className="member-name">{user.name}</span>
                            <span className="member-username">@{user.userName}</span>
                        </label>
                    ))
                )}
            </div>

            <button
                className="add-members-submit"
                onClick={handleAdd}
                disabled={submitting || selectedIds.length === 0 || contacts.length === 0}
            >
                {submitting ? 'Добавление...' : `Добавить (${selectedIds.length})`}
            </button>
        </div>
    );
};

export default AddGroupMembers;