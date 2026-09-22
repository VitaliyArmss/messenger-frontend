// components/SearchList.jsx
// реализовать переключение страниц
import { useState, useEffect, useCallback, useRef } from 'react';

import { usersApi } from '../api/users';

import NullAvatar from './NullAvatar';

import '../css/index.css';

const SearchList = ({ searchValue, openChat }) => {
    const [results, setResults] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState('');

    // Debounce timer
    const timerRef = useRef(null);

    // Функция для выполнения поиска
    const performSearch = useCallback(async (query, pageNum = 1, append = false) => {
        if (!query.trim()) {
            setResults([]);
            setHasMore(false);
            setError('');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await usersApi.search(query, pageNum, 10);
            const newItems = res.data || [];
            if (append) {
                setResults(prev => [...prev, ...newItems]);
            } else {
                setResults(newItems);
            }
            setHasMore(newItems.length === 10);
            setPage(pageNum);
        } catch (err) {
            console.error('Ошибка поиска:', err);
            setError('Не удалось выполнить поиск');
            if (!append) setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Автопоиск с debounce
    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (!searchValue.trim()) {
            setResults([]);
            setHasMore(false);
            setPage(1);
            return;
        }

        timerRef.current = setTimeout(() => {
            performSearch(searchValue, 1, false);
        }, 400); // задержка 400 мс

        return () => clearTimeout(timerRef.current);
    }, [searchValue, performSearch]);

    // Загрузка следующей страницы
    const loadMore = () => {
        if (!loading && hasMore) {
            performSearch(searchValue, page + 1, true);
        }
    };

    if (searchValue.trim() === '') {
        return (<p className="search-text">Введите запрос для поиска</p>);
    }

    return (
        <div className="search-list">
            {loading && results.length === 0 && (
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <p>Загрузка...</p>
                </div>
            )}
            {error && <div className="search-error">{error}</div>}
            {!loading && results.length === 0 && !error && (
                <p className="no-results">Пользователи не найдены</p>
            )}
            {results.length > 0 && (
                <div>
                    <ul className="chat-list">
                        {results.map(user => (
                            <li key={user.id} className="chat-item" onClick={() => {
                                openChat(user.id);
                            }}>
                                <NullAvatar name={user.name} picture={user.avatarUrl} size={48} />
                                <div className="chat-info">
                                    <div className="chat-name">{user.name}</div>
                                    <div>
                                        {user.email || user.userName || ''}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {hasMore && (
                        <div className="search-load-more">
                            <button onClick={loadMore} disabled={loading}>
                                {loading ? 'Загрузка...' : 'Загрузить еще'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchList;