//// pages/Profile.jsx
////реализовать сохранение аватара, добавить информацию о логине, проверка уникальности юзернейма
//import { useState, useRef } from 'react';
//import { useNavigate } from 'react-router-dom';

//import { useAuth } from '../context/AuthContext';

//import { usersApi } from '../api/users';
//import { attachmentsApi } from '../api/attachments';

//import NullAvatar from '../components/NullAvatar';

//import '../css/index.css';

//const Profile = () => {
//    const { user, setUser, logout } = useAuth();
//    const navigate = useNavigate();

//    const [isEditing, setIsEditing] = useState(false);
//    const [loading, setLoading] = useState(false);
//    const [error, setError] = useState('');

//    const [name, setName] = useState(user?.name || '');
//    const [avatarFile, setAvatarFile] = useState(null);
//    const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);

//    const fileInputRef = useRef(null);

//    if (!user) {
//        return <div className="profile-loading">Загрузка...</div>;
//    }

//    const handleCancel = () => {
//        setName(user.name);
//        setAvatarPreview(user.avatarUrl || null);
//        setAvatarFile(null);
//        setIsEditing(false);
//        setError('');
//    };

//    const handleFileChange = (e) => {
//        const file = e.target.files[0];
//        if (!file) return;
//        setAvatarFile(file);
//        const reader = new FileReader();
//        reader.onloadend = () => {
//            setAvatarPreview(reader.result);
//        };
//        reader.readAsDataURL(file);
//    };

//    const handleSave = async () => {
//        if (!name.trim()) {
//            setError('Имя не может быть пустым');
//            return;
//        }

//        setLoading(true);
//        setError('');

//        try {
//            let avatarUrl = user.avatarUrl;

//            if (avatarFile) {
//                const uploadRes = await attachmentsApi.upload(avatarFile);
//                //проверить
//                avatarUrl = uploadRes.data.url;
//            }

//            const updateData = {
//                name: name.trim(),
//                userName: user.userName,
//                avatarUrl: avatarUrl,
//            };

//            await usersApi.update(updateData);

//            const updatedUser = await usersApi.getCurrent();

//            if (setUser) {
//                setUser(updatedUser.data);
//            } else {
//                // Если setUser нет, перезагрузим страницу для обновления контекста
//                window.location.reload();
//            }

//            setIsEditing(false);
//            setAvatarFile(null);
//        } catch (err) {
//            console.error('Ошибка обновления профиля:', err);
//            setError(err.response?.data?.message || 'Не удалось обновить профиль');
//        } finally {
//            setLoading(false);
//        }
//    };

//    const handleLogout = async () => {
//        await logout();
//        navigate('/login');
//    };

//    return (
//        <div className="profile-container">
//            <div className="profile-header">
//                <h2>Профиль</h2>
//                {!isEditing && (
//                    <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
//                        ✎ Редактировать
//                    </button>
//                )}
//            </div>

//            {error && <div className="profile-error">{error}</div>}

//            <div className="profile-avatar-section">
//                <NullAvatar
//                    name={name || user.name}
//                    picture={avatarPreview}
//                    size={100}
//                />
//                {isEditing && (
//                    <div className="profile-avatar-upload">
//                        <button onClick={() => fileInputRef.current.click()}>
//                            Загрузить аватар
//                        </button>
//                        <input
//                            type="file"
//                            accept="image/*"
//                            ref={fileInputRef}
//                            onChange={handleFileChange}
//                            style={{ display: 'none' }}
//                        />
//                        {avatarFile && <span className="file-name">{avatarFile.name}</span>}
//                    </div>
//                )}
//            </div>

//            <div className="profile-info">
//                {isEditing ? (
//                    // Режим редактирования
//                    <div className="profile-edit-form">
//                        <div className="form-group">
//                            <label>Имя</label>
//                            <input
//                                type="text"
//                                value={name}
//                                onChange={(e) => setName(e.target.value)}
//                                placeholder="Ваше имя"
//                            />
//                        </div>
//                        <div className="form-group">
//                            <label>Email</label>
//                            <input
//                                type="email"
//                                value={user.email}
//                                disabled
//                                className="disabled-input"
//                            />
//                            <span className="hint">Email нельзя изменить</span>
//                        </div>
//                        <div className="profile-actions">
//                            <button
//                                className="save-btn"
//                                onClick={handleSave}
//                                disabled={loading}
//                            >
//                                {loading ? 'Сохранение...' : 'Сохранить'}
//                            </button>
//                            <button className="cancel-btn" onClick={handleCancel}>
//                                Отмена
//                            </button>
//                        </div>
//                    </div>
//                ) : (
//                    // Просмотр
//                    <div className="profile-view">
//                        <p><strong>Имя:</strong> {user.name}</p>
//                        <p><strong>Email:</strong> {user.email}</p>
//                        <p><strong>Username:</strong> {user.userName || 'не указан'}</p>
//                        <button className="logout-btn" onClick={handleLogout}>
//                            Выйти
//                        </button>
//                        <button className="back-btn" onClick={() => navigate('/')}>
//                            Назад к чатам
//                        </button>
//                    </div>
//                )}
//            </div>
//        </div>
//    );
//};

//export default Profile;