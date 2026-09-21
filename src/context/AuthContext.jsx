import { createContext, useState, useEffect, useContext } from 'react';
import { authApi } from '../api/auth';
import { usersApi } from '../api/users';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            usersApi.getCurrent()
                .then((res) => setUser(res.data))
                .catch(() => {
                    localStorage.clear();
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const requestData = {
            Email: email,
            Password: password
        };
        const res = await authApi.login(requestData);
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        const userRes = await usersApi.getCurrent();
        setUser(userRes.data);
    };

    const register = async (data) => {
        await authApi.register(data);
        // После регистрации автоматически логиним
        await login(data.Email, data.Password);
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } finally {
            localStorage.clear();
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};