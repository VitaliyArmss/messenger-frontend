
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const PrivateRoute = () => {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p>Загрузка...</p>
        </div>
    );
    return user ? <Outlet /> : <Navigate to="/login" />;
};