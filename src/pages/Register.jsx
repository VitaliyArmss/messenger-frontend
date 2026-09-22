import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';

const Register = () => {
    const [name, setName] = useState('');
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [registerStage, setRegisterStage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleEmailChange = (e) => {
        const value = e.target.value;
        // Разрешаем только латиницу, цифры и специальные символы для email
        const filteredValue = value.replace(/[^a-zA-Z0-9@._\-]/g, '');
        setEmail(filteredValue);
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        const filteredValue = value.replace(/[^a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/g, '');
        setPassword(filteredValue);
    };

    const handleConfirmPasswordChange = (e) => {
        const value = e.target.value;
        const filteredValue = value.replace(/[^a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/g, '');
        setConfirmPassword(filteredValue);
    };

    const handleNameChange = (e) => {
        const value = e.target.value;
        // Разрешаем только латиницу, цифры и специальные символы для email
        const filteredValue = value.replace(/[^a-zA-Z0-9@._\-]/g, '');
        setName(filteredValue);
    };

    const handleUserNameChange = (e) => {
        const value = e.target.value;
        // Только строчная латиница, цифры и подчёркивание
        const filteredValue = value
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '');
        setUserName(filteredValue);
    };

    // Переход на второй шаг с проверкой email
    const handleNext = async () => {
        setError('');
        setLoading(true);

        // 1. Проверка заполненности
        if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
            setError('Все поля обязательны для заполнения');
            setLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            setLoading(false);
            return;
        }

        // 2. Проверка уникальности email
        try {
            const res = await authApi.checkEmail(email);
            if (!res.data.isUnique) {
                setError('Этот email уже зарегистрирован');
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Ошибка проверки email:', err);
            // Если сервер не отвечает, всё равно пропускаем (или показываем ошибку)
            // можно показать общую ошибку, но лучше дать пользователю попробовать
            setError('Ошибка соединения, попробуйте позже');
            setLoading(false);
            return;
        }

        // Всё ок – переходим на шаг 2
        setRegisterStage(2);
        setLoading(false);
    };

    // Возврат на первый шаг
    const handleBack = () => {
        setError('');
        setRegisterStage(1);
    };

    // Финальная отправка с проверкой username
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError('');
        setLoading(true);

        // Проверяем заполненность всех полей
        if (!name.trim() || !userName.trim() || !email.trim() || !password.trim()) {
            setError('Все поля обязательны для заполнения');
            setLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            setLoading(false);
            return;
        }

        // Проверяем уникальность username (на случай, если его заняли между шагами)
        try {
            const res = await authApi.checkUsername(userName);
            if (!res.data.isUnique) {
                setError('Этот никнейм уже занят');
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Ошибка проверки username:', err);
            setError('Ошибка соединения, попробуйте позже');
            setLoading(false);
            return;
        }

        // Отправляем данные
        try {
            const requestData = {
                Name: name,
                UserName: userName,
                Email: email,
                Password: password
            };
            await register(requestData);
            navigate('/');
        } catch (err) {
            const msg = err.response?.data?.message || 'Ошибка регистрации';
            setError(msg);
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <form className="login-form-container" onSubmit={handleSubmit}>
                <h1>Добро пожаловать</h1>
                <h2>
                    {registerStage === 1
                        ? 'Регистрация'
                        : 'Придумайте свой уникальный никнейм'}
                </h2>

                {error && <div className="error">{error}</div>}

                {registerStage === 1 ? (
                    // Первый этап – email и пароли
                    <>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={handleEmailChange}
                            required
                            maxLength={30}
                        />
                        <input
                            type="password"
                            placeholder="Пароль"
                            value={password}
                            onChange={handlePasswordChange}
                            required
                            maxLength={64}
                        />
                        <input
                            type="password"
                            placeholder="Повторите пароль"
                            value={confirmPassword}
                            onChange={handleConfirmPasswordChange}
                            required
                            maxLength={64}
                        />
                        <button type="button" onClick={handleNext} disabled={loading}>
                            {loading ? 'Проверка...' : 'Далее'}
                        </button>
                    </>
                ) : (
                    // Второй этап – имя и логин
                    <>
                        <input
                            type="text"
                            placeholder="Отображаемое имя"
                            value={name}
                            onChange={handleNameChange}
                            required
                            maxLength={20}
                        />
                        <input
                            type="text"
                            placeholder="Уникальный никнейм"
                            value={userName}
                            onChange={handleUserNameChange}
                            required
                            maxLength={15}
                        />
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px' }}>
                                <input
                                    type="checkbox"
                                    checked={agreeToTerms}
                                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                                    required
                                    style={{ marginTop: '2px' }}
                                />
                                <span>
                                    Я согласен с {' '}
                                    <Link to="/privacy" target="_blank" style={{ color: 'var(--primary)' }}>
                                        Политикой конфиденциальности
                                    </Link>
                                    на обработку моих персональных данных.
                                </span>
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={handleBack} style={{ flex: 1 }}>Назад</button>
                            <button
                                type="submit"
                                className="registration-submit"
                                style={{ flex: 2 }}
                            >
                                Регистрация
                            </button>
                        </div>
                    </>
                )}

                <p>
                    {registerStage === 1 ? (
                        <>
                            <Link to="/login">Уже есть аккаунт? Войти</Link>
                            <br />
                            <Link to="/privacy" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Политика обработки персональных данных
                            </Link>
                        </>
                    ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                            Шаг 2 из 2
                        </span>
                    )}
                </p>
            </form>
        </div>
    );
};

export default Register;