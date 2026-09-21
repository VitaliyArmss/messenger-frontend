import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import '../css/index.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleEmailChange = (e) => {
        const value = e.target.value;
        // Разрешаем только латиницу, цифры и специальные символы для email
        const filteredValue = value.replace(/[^a-zA-Z0-9@._\-]/g, '');
        setEmail(filteredValue);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка входа');
        }
    };

    return (
        <div className="login-page">
            <form className="login-form-container" onSubmit={handleSubmit} noValidate>
                <h1>Добро пожаловать</h1>
                <h2>Вход</h2>
                {error && <div className="error">{error}</div>}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={30}
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    maxLength={64}
                />
                <button type="submit">Войти</button>
                <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
                <p style={{ marginTop: '10px', fontSize: '12px' }}>
                    <Link to="/privacy" style={{ color: 'var(--text-muted)' }}>
                        Политика конфиденциальности
                    </Link>
                </p>
            </form>
        </div>

    );
};

export default Login;