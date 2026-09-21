import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import CookieBanner from './components/CookieBanner';
import Login from './pages/Login';
import Register from './pages/Register';
import Chats from './pages/Chats';
import Chat from './components/Chat';
import PrivacyPolicy from './pages/PrivacyPolicy';

function App() {
    return (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route element={<PrivateRoute className="PrivateRoute" />}>
                        <Route path="/" element={<Navigate to="/chats" replace />} />
                        <Route path="/chats" element={<Chats />}>
                            <Route index element={<p>Выберите чат</p>} />
                            <Route path=":chatId" element={<Chat />} />
                        </Route>
                    </Route>
                </Routes>

                <CookieBanner />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;