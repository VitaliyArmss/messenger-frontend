// MessageInput.jsx
import { useRef, useState } from 'react';
import { attachmentsApi } from '../api/attachments';
import '../css/index.css';

const MessageInput = ({ onSend }) => {
    const [text, setText] = useState('');
    const [fileItems, setFileItems] = useState([]);
    const fileInputRef = useRef(null);
    const MAX_FILES = 3;

    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
        if (['mp3', 'flac', 'wav', 'aac', 'ogg', 'wma'].includes(ext)) return '🎵';
        if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return '🎬';
        if (['pdf'].includes(ext)) return '📄';
        return '📎';
    };

    const uploadFile = async (file, itemId) => {
        try {
            const res = await attachmentsApi.upload(file);
            const attachment = res.data;
            setFileItems(prev =>
                prev.map(item =>
                    item.id === itemId
                        ? { ...item, attachment, uploading: false, error: null }
                        : item
                )
            );
        } catch (err) {
            console.error('Ошибка загрузки файла:', err);
            setFileItems(prev =>
                prev.map(item =>
                    item.id === itemId
                        ? { ...item, uploading: false, error: 'Ошибка загрузки' }
                        : item
                )
            );
        }
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        const total = fileItems.length + selectedFiles.length;
        if (total > MAX_FILES) {
            alert(`Можно прикрепить не более ${MAX_FILES} файлов`);
            e.target.value = '';
            return;
        }

        const newItems = selectedFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            attachment: null,
            uploading: true,
            error: null,
        }));

        setFileItems(prev => [...prev, ...newItems]);

        newItems.forEach(item => {
            uploadFile(item.file, item.id);
        });

        e.target.value = '';
    };

    const removeFile = async (id) => {
        const item = fileItems.find(i => i.id === id);
        if (item && item.attachment) {
            try {
                await attachmentsApi.delete(item.attachment.id);
            } catch (err) {
                console.error('Ошибка удаления вложения:', err);
            }
        }
        setFileItems(prev => prev.filter(i => i.id !== id));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const hasAttachments = fileItems.some(item => item.attachment !== null);
        const isUploading = fileItems.some(item => item.uploading);
        if ((!text.trim() && !hasAttachments) || isUploading) return;

        const attachments = fileItems
            .filter(item => item.attachment !== null)
            .map(item => item.attachment);

        onSend(text, attachments);
        setText('');
        setFileItems([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const isUploading = fileItems.some(item => item.uploading);
    const hasAttachments = fileItems.some(item => item.attachment !== null);
    const canSend = (text.trim() !== '' || hasAttachments) && !isUploading;

    return (
        <div className="message-input-wrapper">
            {fileItems.length > 0 && (
                <div className="file-preview-container">
                    {fileItems.map(item => (
                        <div
                            key={item.id}
                            className={`file-preview-item ${item.uploading ? 'uploading' : ''}`}
                        >
                            <span className="file-icon">{getFileIcon(item.file.name)}</span>
                            <span className="file-name">{item.file.name}</span>
                            <span className="file-size">
                                {(item.file.size / 1024).toFixed(1)} KB
                            </span>
                            {item.uploading && <span className="upload-spinner">⏳</span>}
                            {item.error && <span className="file-error">{item.error}</span>}
                            <button
                                type="button"
                                className="file-remove-btn"
                                onClick={() => removeFile(item.id)}
                                disabled={item.uploading}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {fileItems.length < MAX_FILES && (
                        <button
                            type="button"
                            className="add-more-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={fileItems.some(item => item.uploading)}
                        >
                            +
                        </button>
                    )}
                </div>
            )}

            <form className="message-input-form" onSubmit={handleSubmit}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    style={{ display: 'none' }}
                />

                <button
                    type="button"
                    className="attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Прикрепить файл"
                    disabled={fileItems.length >= MAX_FILES || fileItems.some(item => item.uploading)}
                >
                    📎
                </button>

                <input
                    type="text"
                    className="message-input-field"
                    placeholder="Сообщение..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={2000}
                />

                <button type="submit" className="message-send-btn" disabled={!canSend}>
                    ➤
                </button>
            </form>
        </div>
    );
};

export default MessageInput;