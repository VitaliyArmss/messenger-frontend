import { useState } from 'react';
import '../css/index.css';

const MessageActionModal = ({ type, message, onClose, onConfirm }) => {
    const [text, setText] = useState(message?.text || '');

    const isEdit = type === 'edit';

    const handleSubmit = () => {
        if (isEdit && !text.trim()) return;

        onConfirm(isEdit ? text.trim() : undefined);
    };

    return (
        <div className="message-modal-overlay" onClick={onClose}>
            <div
                className="message-modal"
                onClick={event => event.stopPropagation()}
            >
                <h2 className="message-modal-title">
                    {isEdit ? 'Редактировать сообщение' : 'Удалить сообщение'}
                </h2>

                {isEdit ? (
                    <textarea
                        className="message-modal-input"
                        value={text}
                        onChange={event => setText(event.target.value)}
                        autoFocus
                        rows={4}
                    />
                ) : (
                    <p className="message-modal-text">
                        Вы действительно хотите удалить это сообщение?
                    </p>
                )}

                <div className="message-modal-actions">
                    <button
                        type="button"
                        className="message-modal-cancel"
                        onClick={onClose}
                    >
                        Отмена
                    </button>

                    <button
                        type="button"
                        className={`message-modal-confirm ${!isEdit ? 'danger' : ''}`}
                        onClick={handleSubmit}
                    >
                        {isEdit ? 'Сохранить' : 'Удалить'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageActionModal;