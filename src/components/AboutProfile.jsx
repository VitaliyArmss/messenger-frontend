// AboutProfile.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAvatar } from '../hooks/useAvatar';
import { usersApi } from '../api/users';
import { attachmentsApi } from '../api/attachments';
import NullAvatar from './NullAvatar';
import '../css/index.css';

const AboutProfile = ({ onClose }) => {
    const { user, setUser, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [name, setName] = useState(user?.name || '');
    const [userName, setUserName] = useState(user?.userName || '');
    const [avatarFile, setAvatarFile] = useState(null);
    // Используем хук для загрузки аватара из бэкенда (blob URL)
    const avatarBlob = useAvatar(user?.avatarUrl);
    // Для редактирования используем локальный preview (если файл выбран)
    const [localPreview, setLocalPreview] = useState(null);

    // Состояние для анимации
    const [showView, setShowView] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const fileInputRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        setShowView(true);
        setShowEdit(false);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    if (!user) return <div className="profile-loading">Загрузка...</div>;

    const handleUserNameChange = (e) => {
        const value = e.target.value;
        // Только латиница (A-Z, a-z), цифры и подчёркивание
        const filteredValue = value.replace(/[^a-zA-Z0-9_]/g, '');
        setUserName(filteredValue);
    };

    const resetToView = () => {
        setShowView(true);
        setShowEdit(false);
        setIsTransitioning(false);
        setIsEditing(false);
        setAvatarFile(null);
        setLocalPreview(null);
        setError('');
    };

    const handleEdit = () => {
        setName(user.name);
        setUserName(user.userName);
        setAvatarFile(null);
        setLocalPreview(null);
        setError('');
        setIsTransitioning(true);
        setShowView(false);
        timeoutRef.current = setTimeout(() => {
            setShowEdit(true);
            setIsTransitioning(false);
            setIsEditing(true);
        }, 300);
    };

    const handleCancel = () => {
        setName(user.name);
        setUserName(user.userName);
        setAvatarFile(null);
        setLocalPreview(null);
        setError('');
        setIsTransitioning(true);
        setShowEdit(false);
        timeoutRef.current = setTimeout(() => {
            setShowView(true);
            setIsTransitioning(false);
            setIsEditing(false);
        }, 300);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setLocalPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Имя не может быть пустым');
            return;
        }

        if (!userName.trim()) {
            setError('Username не может быть пустым');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();

            formData.append('Name', name.trim());
            formData.append('UserName', userName.trim());

            if (avatarFile) {
                formData.append('AvatarFile', avatarFile);
            }

            const response = await usersApi.update(formData);

            setUser(response.data);

            setIsEditing(false);
            setAvatarFile(null);
            resetToView();
        } catch (err) {
            console.error('Ошибка обновления профиля:', err);

            setError(
                err.response?.data?.message ||
                'Ошибка обновления'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    // Определяем, какую картинку показывать
    const displayPicture = localPreview || avatarBlob || null;

    return (
        <div className="about-profile-container">
            <div className="about-profile-header">
                <h2>Мой профиль</h2>
                <button className="close-btn" onClick={onClose}>✕</button>
            </div>
            {error && <div className="profile-error">{error}</div>}
            <div className="profile-body">
                <div className="profile-avatar-section">
                    <div
                        className={`avatar-wrapper ${isEditing ? 'editable' : ''}`}
                        onClick={isEditing ? () => fileInputRef.current?.click() : undefined}
                    >
                        <NullAvatar name={name} picture={displayPicture} size={100} />
                        {isEditing && (
                            <div className="avatar-overlay">
                                <span>Изменить</span>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>
                <div className="profile-info">
                    <div className={`profile-view ${showView ? 'active' : 'inactive'}`}>
                        <p><strong>Имя:</strong> {user.name}</p>
                        <p><strong>Username:</strong> {user.userName}</p>
                        <p className="email-container">
                            <strong>Email: {user.email}</strong>
                            <span className="email-hint">виден только вам</span>
                        </p>
                        <div className="profile-actions">
                            <button className="primary-btn" onClick={handleEdit} disabled={isTransitioning}>Редактировать</button>
                            <button className="logout-btn" onClick={handleLogout}>Выйти</button>
                        </div>
                    </div>
                    <div className={`profile-edit-form ${showEdit ? 'active' : 'inactive'}`}>
                        <div className="form-group">
                            <label>Имя</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ваше имя"
                                maxLength={20}
                            />
                        </div>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                placeholder="Уникальный никнейм"
                                value={userName}
                                onChange={handleUserNameChange}
                                required
                                maxLength={15}
                            />
                        </div>
                        <div className="profile-actions">
                            <button className="save-btn" onClick={handleSave} disabled={loading || isTransitioning}>
                                {loading ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button className="cancel-btn" onClick={handleCancel} disabled={isTransitioning}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutProfile;