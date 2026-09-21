// components/SearchBar.jsx
import { useState } from 'react';
import '../css/index.css';

const SearchBar = ({ onSearch, placeholder = "Поиск...", onFocus, onBlur }) => {
    const [query, setQuery] = useState('');

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        onSearch(value);
    };

    return (
        <div className="search-bar">
            <input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={handleChange}
                className="search-input"
                onFocus={onFocus}
                onBlur={onBlur}
                maxLength={20}
            />
        </div>
    );
};

export default SearchBar;