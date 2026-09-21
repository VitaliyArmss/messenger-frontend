import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import '../css/index.css';

const MessageContextMenu = ({ x, y, message, isOwn, onClose, onCopy, onEdit, onDelete }) => {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ left: x, top: y });

    useLayoutEffect(() => {
        if (!menuRef.current) return;

        const menuWidth = menuRef.current.offsetWidth;
        const menuHeight = menuRef.current.offsetHeight;
        const padding = 10; // отступ от краёв окна

        let newLeft = x;
        let newTop = y;

        // Проверяем правую границу
        if (x + menuWidth + padding > window.innerWidth) {
            newLeft = x - menuWidth;
        }

        // Проверяем левую границу (если меню слишком широкое)
        if (newLeft < padding) {
            newLeft = padding;
        }

        // Проверяем нижнюю границу (чтобы меню не уходило вниз)
        if (y + menuHeight + padding > window.innerHeight) {
            newTop = y - menuHeight;
        }
        if (newTop < padding) {
            newTop = padding;
        }

        setPosition({ left: newLeft, top: newTop });
    }, [x, y]);

    // Закрытие при клике вне меню
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [onClose]);

    return (
        <div
            className="message-context-menu"
            ref={menuRef}
            style={{
                position: 'fixed',
                left: position.left,
                top: position.top,
                zIndex: 1000,
            }}
        >
            <ul>
                <li onClick={() => { onCopy(); onClose(); }}>Копировать текст</li>
                {isOwn && (
                    <>
                        <li onClick={() => { onEdit(); onClose(); }}>Редактировать</li>
                        <li onClick={() => { onDelete(); onClose(); }}>Удалить</li>
                    </>
                )}
            </ul>
        </div>
    );
};

export default MessageContextMenu;